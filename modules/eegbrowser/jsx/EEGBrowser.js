import React, { Component } from 'react';
import { SignalPlot, Channel } from './SignalPlot';
import MRILoader from './MRILoader';
import { LOW_PASS_FILTERS, HIGH_PASS_FILTERS, FILTERS } from './Filters';

const NUM_REGIONS = 8;
const POINTS_PER_REGION = 30;
const SAMPLES_PER_POINT = 500;


class Region {
  constructor(name, label, center, colorCode = { r: 0, g: 0, b: 0 }) {
    this.name = name;
    this.label = label;
    this.colorCode = colorCode;
    this.channels = [];
    this.generateChannels(POINTS_PER_REGION, center);
  }
  generateChannels(numChannels, center) {
    for (let i = 0; i < numChannels; i += 1) {
      const channel = new Array(3).fill(0).map(() => (2.0 * Math.random() - 1.0) / NUM_REGIONS);
      channel[0] += center[0]
      channel[1] += center[1]
      channel[2] += center[2]
      this.channels.push(new Channel(`${this.name} : channel_${i}`, channel, SAMPLES_PER_POINT));
    }
  }
}


function makeRegions(numRegions) {
  const regions = [];
  const rc = () => Math.floor(Math.random() * 250);
  for (let i = 0; i < numRegions; i += 1) {
    const center = new Array(3).fill(0).map(() => (2.0 * Math.random() - 1.0));
    const color = {r: rc(), g: rc(), b: rc()}
    const region = new Region(`region${i}`, `Region ${i}`, center, color);
    regions.push(region);
  }
  return regions;
}

class RegionSelect extends Component {
  constructor(props) {
    super(props);
    this.defaultProps = {
      regions: [],
      selected: []
    };
  }
  render() {
    const regionElement = (region, selected, onclick) => {
      const c = region.colorCode;
      return (
        <li
          key={region.name}
          className={`region-item ${selected ? 'selected-region' : 'unselected-region'}`}
          onClick={() => onclick(region)}
          onMouseEnter={() => { this.props.hoverRegion(region); }}
          onMouseLeave={() => { this.props.hoverRegion(region); }}
        >
          <div
            className="region-color-code"
            style={{ 'backgroundColor': `rgb(${c.r}, ${c.g}, ${c.b})` }}
          >
          </div>
          {region.label + (selected ? '*' : '')}
        </li>
      );
    };
    const regionElements = this.props.regions.map((region) => {
      if (this.props.selected.find(r => r === region)) {
        return regionElement(region, true, this.props.unselectRegion);
      }
      return regionElement(region, false, this.props.selectRegion);
    });
    return (
      <div className="region-select">
        <ul className="region-select-list">
          {regionElements}
        </ul>
      </div>
    );
  }
}

const YELLOW = 0xFF6628;
const GREEN = 0x34A853;
const BLUE = 0x4285F4;
class MRIView extends Component {
  componentDidMount() {
    const width = 500;
    const height = 400;
    const renderer = new THREE.WebGLRenderer();
    this.canvas = renderer.domElement;
    this.canvas.width = width;
    this.canvas.height = height;
    this.addCanvas()
    renderer.setSize(width, height);
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.scene = new THREE.Scene();
    this.mriLoader = new MRILoader(this.scene);
    this.meshes = [];
    this.mriLoader.initialize().then((dimensions) => {
      const scale = dimensions.scale / 2;
      this.camera.position.z = -dimensions.diagonal / 1.7;
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
      const material = new THREE.MeshBasicMaterial({ color: YELLOW });
      const geometry = new THREE.SphereBufferGeometry(scale / (NUM_REGIONS * 10) , 8, 8);
      this.props.regions.forEach((region, i) => {
        region.channels.forEach((channel) => {
          const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
          mesh.material.copy(material)
          mesh.position.fromArray(channel.position);
          mesh.position.multiplyScalar(scale);
          this.scene.add(mesh);
          if (!this.meshes[i]) {
            this.meshes[i] = [];
          }
          this.meshes[i].push(mesh);
        });
      });
      const self = this;
      function run() {
        renderer.render(self.scene, self.camera);
        window.requestAnimationFrame(run.bind(self));
      }
      run();
    });
  }
  componentDidUpdate() {
    this.addCanvas();
    this.props.regions.forEach((region, i) => {
      region.channels.forEach((channel) => {
        if (this.meshes[i]) {
          this.meshes[i].forEach(m => { m.material.color.setHex(YELLOW); });
          if (this.props.selected.find(r => r === region)) {
            this.meshes[i].forEach(m => { m.material.color.setHex(GREEN); });
          }
          if (this.props.hoveredRegion === region) {
            this.meshes[i].forEach(m => { m.material.color.setHex(BLUE); });
          }
        }
      });
    });
  }
  addCanvas() {
    if (this.container && this.lastContainer !== this.container) {
      this.container.appendChild(this.canvas);
      this.lastContainer = this.container;
    }
  }
  render() {
    if (this.props.showMRI) {
      return (
        <div
          className="mri-view-container"
          ref={(div) => { this.container = div; }}
        >
        </div>
      );
    }
    return null;
  }
}

class FilterSelect extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    const optionElement = option => (
      <option key={option.key} value={option.key}>
        {option.label}
      </option>
    );
    return (
      <select
        className='signal-filter-dropdown'
        onChange={ (e) => { this.props.onChange(e.target.value); }}
        value={this.props.filter}
      >
        {this.props.filters.map(optionElement)}
      </select>
    );
  }
}

const ZOOM_AMOUNT = 1;
const INTERVAL_MOVE_AMOUNT = 1;
const PLOTS_PER_GROUP = 7;
const PLOT_HEIGHT = 100;

const countNumChannels = regions => regions.map(r => r.channels.length).reduce((a,b) => a + b, 0);

class SignalPlots extends Component {
  constructor(props) {
    super(props);
    this.lastMouseX = null;
    this.drawn = [];
    this.state = {
      cursorX: null,
      group: 0,
      tBounds: { tmin: -0.1, tmax: 25 },
      filters: { low: 'none', hi: 'none' },
    };
  }
  componentWillReceiveProps(nextProps) {
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    const numChannels = countNumChannels(nextProps.selected);
    const newGroup = minPlot > numChannels ? Math.floor(numChannels / PLOTS_PER_GROUP) : this.state.group;
    this.setState({ group : newGroup });
  }
  componentDidMount() {
    // If user mouses up anywhere in the browser window stop translating time interval.
    window.addEventListener('mouseup', () => { this.lastMouseX = null; });
    window.addEventListener('resize', () => { this.forceUpdate(); });
  }
  render() {
    const onWheel = (dy) => {
      const { tmin, tmax } = this.state.tBounds;
      if (tmax - tmin <= 5 && dy < 0) {
        return;
      }
      if (tmax - tmin >= 65 && dy > 0) {
        return;
      }
      this.setState({
        tBounds: {
          tmin: tmin - Math.sign(dy) * ZOOM_AMOUNT * (tmax - tmin) / 15,
          tmax: tmax + Math.sign(dy) * ZOOM_AMOUNT * (tmax - tmin) / 15
        }
      });
    };
    const onMouseMove = (shift, leftClick, x) => {
      if (!this.lastMouseX) {
        this.lastMouseX = x;
        return;
      }
      const { width, left } = this.container.getBoundingClientRect();
      const { tmin, tmax } = this.state.tBounds;
      const dx = x - this.lastMouseX;
      this.lastMouseX = x;
      if (shift && leftClick) {
        this.setState({
          tBounds: {
            tmin: tmin - dx * INTERVAL_MOVE_AMOUNT * (tmax - tmin) / width,
            tmax: tmax - dx * INTERVAL_MOVE_AMOUNT * (tmax - tmin) / width
          }
        });
      }
      if (!shift && leftClick) {
        const xInv = d3.scale.linear()
                       .domain([30, width - 15])
                       .range([tmin, tmax]);
        if (x - left > 30) {
          this.setState({ cursorX: xInv(x - left) });
        }
      }
    };
    const enabled = (text, incr) => (
      <div
        className="signal-plots-button"
        onClick={() => { this.setState({ group: this.state.group + incr }); }}
      >
        {text}
      </div>
    );
    const disabled = text => (
      <div className="signal-plots-button disabled">
        {text}
      </div>
    );
    const numChannels = countNumChannels(this.props.selected);
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    let maxPlot = (PLOTS_PER_GROUP - 1) * (this.state.group + 1);
    const showNext = maxPlot < numChannels
    const showPrev = this.state.group > 0;
    if (minPlot + (PLOTS_PER_GROUP - 1) >= numChannels) {
      maxPlot = maxPlot - (numChannels - (minPlot + (PLOTS_PER_GROUP - 1))) - 1;
    }
    const selectLow = (value) => {
      this.setState({ filters: { low: value, hi: this.state.filters.hi } });
    };
    const selectHi = (value) => {
      this.setState({ filters: { low: this.state.filters.low, hi: value } });
    };
    const showingPlots = (
      <div className="signal-plots-group-number">
        Showing plots: {minPlot + 1} to {maxPlot + 1} out of {numChannels}
      </div>
    )
    const plotElements = [];
    let index = 0;
    this.props.selected.forEach((region) => {
      region.channels.forEach((channel) => {
        const {low, hi} = this.state.filters;
        channel.applyFilter(low, hi)
        const axisProps = {
          drawXAxis: false,
          xAxisLabel: 'time (sec)',
          yAxisLabel: 'uV',
        };
        if (index === minPlot) {
          axisProps.drawXAxis = true;
          axisProps.xAxisOrientation = 'top';
          axisProps.xAxisLabelPos = null;
          axisProps.yAxisLabelPos = { x: -23, y: 10 };
        }
        if (index === maxPlot) {
          axisProps.drawXAxis = true;
          axisProps.xAxisOrientation = 'bottom';
          axisProps.xAxisLabelPos = { x: 5, y: 28 };
          axisProps.yAxisLabelPos = { x: -23, y: 7 };
        }
        if (index >= minPlot && index <= maxPlot) {
          plotElements.push(
            <SignalPlot
              key={index}
              className='signal-plot-item'
              channel={channel}
              colorCode={region.colorCode}
              height={PLOT_HEIGHT}
              tBounds={this.state.tBounds}
              backgroundColor={index % 2 === 0 ? '#fff' : '#eee'}
              cursorX={this.state.cursorX}
              drawXAxis={axisProps.drawXAxis}
              xAxisOrientation={axisProps.xAxisOrientation}
              xAxisLabel={axisProps.xAxisLabel}
              xAxisLabelPos={axisProps.xAxisLabelPos}
              yAxisLabel={axisProps.yAxisLabel}
              yAxisLabelPos={axisProps.yAxisLabelPos}
            />
          );
        }
        index++;
      });
    });
    return (
      <div className="signal-plots-container">
        <div className="signal-plots-toolbar">
          <div className="signal-plots-buttons">
            {showPrev ? enabled('Previous', -1) : disabled('Previous')}
            {showNext ? enabled('Next', +1) : disabled('Next')}
            {numChannels > 0 ? showingPlots : null}
          </div>
          <div className="signal-plots-filters">
            <FilterSelect filters={LOW_PASS_FILTERS} filter={this.state.filters.low} onChange={selectLow} />
            <FilterSelect filters={HIGH_PASS_FILTERS} filter={this.state.filters.hi} onChange={selectHi} />
          </div>
          <div className="signal-plots-slider"></div>
        </div>
        <div
          className="signal-plots"
          ref={(container) => { this.container = container; }}
          onWheel={(e) => { if (e.shiftKey) { e.preventDefault(); onWheel(e.deltaY); } }}
          onMouseMove={(e) => { onMouseMove(e.shiftKey, e.buttons > 0 && e.button === 0, e.clientX); }}
        >
          {plotElements}
        </div>
      </div>
    );
  }
}

export default class EEGBrowser extends Component {
  constructor(props) {
    super(props);
    const regions = makeRegions(NUM_REGIONS)
    this.state = {
      regions,
      selected: [regions[0]],
      expanded: false
    }
  }
  render() {
    const unselectRegion = (region) => {
      this.setState({
        selected: this.state.selected
          .filter(r => r !== region) // remove all equal regions.
      });
    };
    const selectRegion = (region) => {
      this.setState({
        selected: this.state.selected
          .filter(r => r !== region) // remove all equal regions
          .concat([region]) // select the region
      });
    };
    const expandBar = (
      <div
        className="expand-bar"
        onClick={() => this.setState({ expanded: !this.state.expanded })}
      >
        <span className="expand-bar-icon">{this.state.expanded ? '>' : '<'}</span>
      </div>
    );
    const regionSelect = (
      <RegionSelect
        regions={this.state.regions}
        selected={this.state.selected}
        unselectRegion={unselectRegion}
        selectRegion={selectRegion}
        hoverRegion={(region) => { this.setState({ hoveredRegion: region }); }}
        onMouseLeave={() => { this.setState({ hoveredRegion: null }); }}
      >
      </RegionSelect>
    );
    const mriView = (
      <MRIView
        regions={this.state.regions}
        selected={this.state.selected}
        hoveredRegion={this.state.hoveredRegion}
        showMRI={!this.state.expanded}
      >
      </MRIView>
    );
    return (
      <div className="eeg-browser">
        {this.state.expanded ? null : regionSelect}
        {mriView}
        {expandBar}
        <SignalPlots
          selected={this.state.selected}
        >
        </SignalPlots>
      </div>
    );
  }
}

window.EEGBrowser = React.createFactory(EEGBrowser);
