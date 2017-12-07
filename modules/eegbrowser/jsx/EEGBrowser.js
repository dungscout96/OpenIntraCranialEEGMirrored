import React, { Component } from 'react';
import { SignalPlot, Channel } from './SignalPlot';
import MRILoader from './MRILoader';
import Panel from '../../../jsx/Panel';

import { LOW_PASS_FILTERS, HIGH_PASS_FILTERS, FILTERS } from './Filters';

const NUM_REGIONS = 8;
const POINTS_PER_REGION = 5;
const SAMPLES_PER_POINT = 200*60;


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

const BRAIN_MOCK = {
  type: 'inner',
  label: 'Brain',
  value: [
    {
      type: 'inner',
      label: 'Left Hemisphere',
      value: [
        { type: 'leaf', label: 'Lobe 1', value: makeRegions(NUM_REGIONS) },
        { type: 'leaf', label: 'Lobe 2', value: makeRegions(NUM_REGIONS) },
        { type: 'leaf', label: 'Lobe 3', value: makeRegions(NUM_REGIONS) },
      ],
    },
    {
      type: 'inner',
      label: 'Right Hemisphere',
      value: [
        { type: 'leaf', label: 'Lobe 4', value: makeRegions(NUM_REGIONS) },
        { type: 'leaf', label: 'Lobe 5', value: makeRegions(NUM_REGIONS) },
        { type: 'leaf', label: 'Lobe 6', value: makeRegions(NUM_REGIONS) } ,
      ],
    }
  ]
};

const getLeafRegions = (node) => {
  switch(node.type) {
    case 'inner':
      return node.value.map(getLeafRegions).reduce((list, next) => list.concat(next));
    case 'leaf':
      return node.value;
  }
  return [];
};

class RegionSelect extends Component {
  constructor(props) {
    super(props);
    this.defaultProps = {
      brain: [],
      selected: [],
    };
    this.state = {
      activePage: props.brain,
      pageStack: []
    };
  }
  render() {
    const clickPage = (node) => {
      const lastPage = this.state.activePage;
      const { pageStack } = this.state;
      pageStack.push(lastPage);
      this.setState({ activePage: node, pageStack });
    };
    const back = () => {
      const activePage = this.state.pageStack.pop();
      this.setState({
        activePage,
        pageStack: this.state.pageStack
      });
    };
    const renderRegionElement = (region, selected, onclick) => {
      const c = region.colorCode;
      return (
        <li
          key={region.name}
          className={`region-select-item ${selected ? 'selected-region' : 'unselected-region'}`}
          onClick={() => onclick(region)}
          onMouseEnter={() => { this.props.hoverRegions([region]); }}
          onMouseLeave={this.props.onMouseLeave}
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
    const renderRegionSelector = (region) => {
      if (this.props.selected.find(r => r === region)) {
        return renderRegionElement(region, true, this.props.unselectRegion);
      }
      return renderRegionElement(region, false, this.props.selectRegion);
    };
    const renderInnerNode = (node) => {
        const regions = getLeafRegions(node);
        return (
          <li
          key={node.label}
          className="region-select-item"
          onClick={() => clickPage(node)}
          onMouseEnter={() => { this.props.hoverRegions(regions); }}
          onMouseLeave={this.props.onMouseLeave}
        >
          {node.label}
        </li>
      );
    };
    const renderNode = (node) => {
      if (!node) {
        return null;
      }
      switch(node.type) {
        case 'inner':
          return node.value.map(renderInnerNode);
        case 'leaf':
          return node.value.map(renderRegionSelector);
      }
      return null;
    };
    return (
      <div className="region-select">
        <div className="toolbar">
          <div className="toolbar-layer">
            <div className="toolbar-buttons">
              <div
                className={`round-button${this.state.pageStack.length === 0 ? ' disabled' : ''}`}
                onClick={back}
              >
                Back
              </div>
            </div>
          </div>
        </div>
        <ul className="region-select-list">
          {renderNode(this.state.activePage)}
        </ul>
      </div>
    );
  }
}

class SelectionFilters extends Component {
  constructor(props) {
    super(props);
    this.state = {
      tags: {}
    };
  }
  render() {
    const addTag = (key, value, label, optionLabel) => {
      const { tags } = this.state;
      const newTag = { value, label, optionLabel };
      if (tags[key]) {
        if (!(tags[key].find(tag => tag.value === value))) {
          tags[key].push(newTag)
        }
      } else {
        tags[key] = [newTag];
      }
      this.setState({ tags });
    };
    const setDropdown = (k, v) => { this.setState({ [k]: v }); };
    const dropdownProps = (userInputCallback, props) => {
      const onUserInput = (k, v) => userInputCallback(k, v, props.label, props.options[v]);
      return Object.assign({ onUserInput }, props);
    };
    const removeTag = (tagKey, tag) => {
      const { tags } = this.state;
      if (tags[tagKey]) {
        tags[tagKey] = tags[tagKey].filter(t => t.value !== tag.value);
      }
      this.setState({ tags });
    };
    const tagRemover = (tagKey, tag) => (
      <span className='tag-remove-button' onClick={() => removeTag(tagKey, tag)}>x</span>
    );
    const tagElements = [];
    Object.keys(this.state.tags).forEach((key) => {
      const tags = this.state.tags[key];
      const tagElems = tags.map(tag => (
        <span key={tag.optionLabel} className="selection-filter-tag">
          {tag.label}: {tag.optionLabel} {tagRemover(key, tag)}
        </span>
      ));
      tagElements.push(...tagElems);
    });
    const regionTagRemover = (region) => (
      <span className='tag-remove-button' onClick={() => this.props.onRemoveRegion(region)}>
        x
      </span>
    );
    const regionTagElements = this.props.selectedRegions.map((region) => (
      <span key={region.name} className="selection-filter-tag">
        {region.name} {regionTagRemover(region)}
      </span>
    ));
    const formElements = {
      center: dropdownProps(addTag, {
        type: 'select',
        name: 'center',
        label: 'Center',
        options: {
          'M': 'MNI',
          'N': 'CHUM',
          'G': 'CHUGA'
        },
      }),
      electrodeType: dropdownProps(addTag, {
        type: 'select',
        name: 'electrodeType',
        label: 'Electrode Type',
        options: {
          'D': 'Dixi sEEG',
          'M': 'Custom-built MNI sEEG',
          'A': ' Ad-Tech depth',
          'G': 'Ad-Tech subdural grid/strip'
        }
      }),
      notRepeatedContacts: dropdownProps(setDropdown, {
        type: 'select',
        name: 'notRepeatedContacts',
        value: this.state.notRepeatedContacts,
        label: 'Non-Repeated Contacts',
        options: {
          'nonrepeated': 'Show not repeated contacts'
        }
      }),
      oneContactPerPatientPerRegion: dropdownProps(setDropdown, {
        type: 'select',
        name: 'oneContactPerPatientPerRegion',
        value: this.state.oneContactPerPatientPerRegion,
        label: 'One Contact Per Patient Per Region',
        options: {
          'onepppr': 'Show one contact per patient per region'
        },
      })
    };
    return (
      <Panel title="Channel Selection Filters">
        <FormElement
          name="selectionFilters"
          columns={2}
          formElements={formElements}
        >
        </FormElement>
        <div className="selection-filter-tags">
          Filter Tags: {tagElements}
        </div>
        <div className="selection-filter-tags">
          Region Tags: {regionTagElements}
        </div>
      </Panel>
    );
  }
}

const YELLOW = 0xFF6628;
const GREEN = 0x34A853;
const BLUE = 0x4285F4;
class MRIView extends Component {
  componentDidMount() {
    const width = 400;
    const height = 350;
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
          if (this.props.hoveredRegions.includes(region)) {
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

class SignalFilterSelect extends Component {
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
const PLOT_HEIGHT = 90;
const Y_BOUNDS = { ymin: -2.1, ymax: 2.1 };
const Y_WIDTH = 60;

const countNumChannels = regions => regions.map(r => r.channels.length).reduce((a,b) => a + b, 0);

class SignalPlots extends Component {
  constructor(props) {
    super(props);
    this.lastMouseX = null;
    this.drawn = [];
    this.state = {
      cursorT: null,
      group: 0,
      tBounds: { tmin: -0.1, tmax: 20 },
      yBounds: {},
      filters: { low: 'none', hi: 'none' }
    };
  }
  componentWillReceiveProps(nextProps) {
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    const numChannels = countNumChannels(nextProps.selected);
    const newGroup = minPlot > numChannels ? Math.floor(numChannels / PLOTS_PER_GROUP) : this.state.group;
    this.setState({ group : newGroup });
  }
  componentDidMount() {
    this.resizeUpdate = () => { this.forceUpdate(); };
    window.addEventListener('resize', this.resizeUpdate);
    // If user mouses up anywhere in the browser window stop translating time interval.
    window.addEventListener('mouseup', () => { this.lastMouseX = null; });
  }
  componentWillUnmount() {
    window.removeEveEventListener('resize', this.resizeUpdate);
  }
  generatePlotElements(minPlot, maxPlot) {
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
          const zoom = (leftClick, multiplier) => {
            if (leftClick) {
              this.state.yBounds[channel.name] = this.state.yBounds[channel.name] || Y_BOUNDS;
              let { ymin, ymax } = this.state.yBounds[channel.name];
              ymin *= multiplier;
              ymax *= multiplier;
              this.state.yBounds[channel.name] = { ymin, ymax };
              this.setState({ yBounds: this.state.yBounds });
            }
          };
          const { ymin, ymax } = this.state.yBounds[channel.name] || Y_BOUNDS;
          plotElements.push(
            <SignalPlot
              key={index}
              className='signal-plot-item'
              channel={channel}
              colorCode={region.colorCode}
              height={PLOT_HEIGHT}
              yAxisWidth={Y_WIDTH}
              tBounds={this.state.tBounds}
              yBounds={{ ymin, ymax }}
              onPlus={(e) => { e.stopPropagation(); zoom(e.button === 0, 0.9); }}
              onMinus={(e) => { e.stopPropagation(); zoom(e.button === 0, 1.1); }}
              backgroundColor={index % 2 === 0 ? '#fff' : '#eee'}
              cursorT={this.state.cursorT}
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
    return plotElements;
  }
  render() {
    const numChannels = countNumChannels(this.props.selected);
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    let maxPlot = (PLOTS_PER_GROUP - 1) * (this.state.group + 1);
    const showNext = maxPlot < numChannels
    const showPrev = this.state.group > 0;
    if (minPlot + PLOTS_PER_GROUP > numChannels) {
      maxPlot = Math.min(minPlot + PLOTS_PER_GROUP, numChannels) - 1;
    }
    const onWheel = (dy) => {
      const { tmin, tmax } = this.state.tBounds;
      if (tmax - tmin <= 0.5 && dy < 0) {
        return;
      }
      if (tmax - tmin >= 25 && dy > 0) {
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
        const tInv = d3.scale.linear()
                       .domain([Y_WIDTH, width - Y_WIDTH / 4])
                       .range([tmin, tmax]);
        if (x - left > Y_WIDTH) {
          this.setState({ cursorT: tInv(x - left) });
        }
      }
    };
    const selectLow = (value) => {
      this.setState({ filters: { low: value, hi: this.state.filters.hi } });
    };
    const selectHi = (value) => {
      this.setState({ filters: { low: this.state.filters.low, hi: value } });
    };
    const enabled = (text, incr) => (
      <div
        className="round-button"
        onClick={() => { this.setState({ group: this.state.group + incr }); }}
      >
        {text}
      </div>
    );
    const disabled = text => (
      <div className="round-button disabled">
        {text}
      </div>
    );
    const showingPlots = (
      <div className="signal-plots-group-number">
        Showing plots: {minPlot + 1} to {maxPlot + 1} out of {numChannels}
      </div>
    );
    const plotElements = this.generatePlotElements(minPlot, maxPlot);
    return (
      <div className="signal-plots-container">
        <div className="toolbar">
          <div className="toolbar-layer">
            <div className="toolbar-buttons">
              {showPrev ? enabled('Previous', -1) : disabled('Previous')}
              {showNext ? enabled('Next', +1) : disabled('Next')}
              {numChannels > 0 ? showingPlots : null}
            </div>
          </div>
          <div className="toolbar-layer">
            <div
              className="round-button"
              onClick={() => { this.setState({ yBounds: {} }); }}
            >
              Reset Y Zoom
            </div>
            <div className="signal-plots-filters">
              <SignalFilterSelect filters={LOW_PASS_FILTERS} filter={this.state.filters.low} onChange={selectLow} />
              <SignalFilterSelect filters={HIGH_PASS_FILTERS} filter={this.state.filters.hi} onChange={selectHi} />
            </div>
          </div>
        </div>
        <div
          className="signal-plots"
          ref={(container) => { this.container = container; }}
          onWheel={(e) => { if (e.shiftKey) { e.preventDefault(); onWheel(e.deltaY); } }}
          onMouseMove={(e) => { onMouseMove(e.shiftKey, e.buttons > 0 && e.button === 0, e.clientX); }}
          onMouseDown={(e) => { onMouseMove(e.shiftKey, e.buttons > 0 && e.button === 0, e.clientX); }}
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
    this.state = {
      brain: props.brain || BRAIN_MOCK,
      selected: [BRAIN_MOCK.value[0].value[0].value[0]],
      hoveredRegions: [],
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
        brain={this.state.brain}
        selected={this.state.selected}
        unselectRegion={unselectRegion}
        selectRegion={selectRegion}
        hoverRegions={(regions) => { this.setState({ hoveredRegions: regions }); }}
        onMouseLeave={() => { this.setState({ hoveredRegions: [] }); }}
      >
      </RegionSelect>
    );
    const l = getLeafRegions(this.state.brain);
    const mriView = (
      <MRIView
        regions={l}
        selected={this.state.selected}
        hoveredRegions={this.state.hoveredRegions}
        showMRI={!this.state.expanded}
      >
      </MRIView>
    );
    return (
      <div className="eeg-browser">
        <div className="eeg-browser-row">
          <SelectionFilters
            selectedRegions={this.state.selected}
            onRemoveRegion={unselectRegion}
          >
          </SelectionFilters>
        </div>
        <div className="eeg-browser-row">
          {this.state.expanded ? null : regionSelect}
          {mriView}
          {expandBar}
          <SignalPlots
            selected={this.state.selected}
          >
          </SignalPlots>
        </div>
      </div>
    );
  }
}

window.EEGBrowser = React.createFactory(EEGBrowser);
