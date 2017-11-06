import React, { Component } from 'react';
import MRILoader from './MRILoader';

const NUM_REGIONS = 8;
const POINTS_PER_REGION = 30;
const SAMPLES_PER_POINT = 500;

class Region {
  constructor(name, label, center) {
    this.name = name;
    this.label = label;
    this.points = [];
    this.generatePoints(POINTS_PER_REGION, center);
  }
  generatePoints(numPoints, center) {
    for (let i = 0; i < numPoints; i += 1) {
      const point = new Array(3).fill(0).map(() => (2.0 * Math.random() - 1.0) / NUM_REGIONS);
      point[0] += center[0]
      point[1] += center[1]
      point[2] += center[2]
      this.points.push(new Point(point, SAMPLES_PER_POINT));
    }
  }
}

class Point {
  constructor(position, timeSamples, tmin = 0, tmax = 60) {
    this.tmin = tmin;
    this.tmax = tmax;
    this.domain = new Float32Array(timeSamples).fill(0)
    this.domain.forEach((_, i) => {
      const t = i / timeSamples;
      this.domain[i] = tmin * (1 - t) + tmax * t;
    });
    this.signal = new Float32Array(timeSamples).fill(0)
    this.signal.forEach((_, i) => {
      this.signal[i] = 2.0 * Math.random() - 1.0;
    });
    this.position = position;
    this.hovered = false;
  }
}

function makeRegions(numRegions) {
  const regions = [];
  for (let i = 0; i < numRegions; i += 1) {
    const center = new Array(3).fill(0).map(() => (2.0 * Math.random() - 1.0));
    const region = new Region(`region${i}`, `Region ${i}`, center);
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
    const regionElement = (region, selected, onclick) => (
      <li
        key={region.name}
        className={`region-item ${selected ? 'selected-region' : 'unselected-region'}`}
        onClick={() => onclick(region)}
        onMouseEnter={() => { this.props.hoverRegion(region); }}
        onMouseLeave={() => { this.props.hoverRegion(region); }}
      >
        {region.label + (selected ? '*' : '')}
      </li>
    );
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
        region.points.forEach((point) => {
          const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
          mesh.material.copy(material)
          mesh.position.fromArray(point.position);
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
      region.points.forEach((point) => {
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

const ZOOM_AMOUNT = 1;
const INTERVAL_MOVE_AMOUNT = 1;
const PLOTS_PER_PAGE = 7;

const countNumPoints = regions => regions.map(r => r.points.length).reduce((a,b) => a + b, 0);

class SignalPlots extends Component {
  constructor(props) {
    super(props);
    this.lastMouseX = null;
    this.drawn = [];
    this.state = {
      bounds: { tmin: -0.1, tmax: 25 },
      page: 0
    };
  }
  componentWillReceiveProps(nextProps) {
    const maxPage = Math.floor(countNumPoints(nextProps.selected) / PLOTS_PER_PAGE);
    const newPage = this.state.page > maxPage ? maxPage : this.state.page;
    this.setState({ page : newPage });
  }
  componentDidMount() {
    // If user mouses up anywhere in the browser window stop translating time interval.
    window.addEventListener('mouseup', () => { this.lastMouseX = null; });
    window.addEventListener('resize', () => { this.forceUpdate(); });
    this.renderPlots();
  }
  componentDidUpdate() {
    this.renderPlots();
  }
  renderPlots() {
    this.width = this.container.getBoundingClientRect().width - 20;
    const HEIGHT = 100;
    const { tmin, tmax } = this.state.bounds;
    if (this.xAxisTop) {
      this.xAxisTop.remove();
      this.xAxisTop = undefined;
    }
    if (this.xAxisBottom) {
      this.xAxisBottom.remove();
      this.xAxisBottom = undefined;
    }
    const x = d3.scale.linear()
                .domain([tmin, tmax])
                .rangeRound([0, this.width]);
    const y = d3.scale.linear()
                .domain([-1.7, 1.7])
                .rangeRound([HEIGHT, 0]);
    const yAxis = d3.svg.axis()
                    .scale(y)
                    .ticks(0)
                    .tickValues([-1, 0, 1])
                    .outerTickSize(0)
                    .orient('left');
    const drawSignalLine = (g, point, indexes) => {
      const signalLine = d3.svg.line()
                           .x(i => x(point.domain[i] || 0))
                           .y(i => y(point.signal[i] || 0));
      return g.append('path')
              .attr('fill', 'none')
              .attr('stroke', 'steelblue')
              .attr('stroke-linejoin', 'round')
              .attr('stroke-linecap', 'round')
              .attr('stroke-width', 1.5)
              .attr('d', signalLine(indexes));
    };
    const drawSecondTicks = (g, yAxis, tmin, tmax) => {
      const ctmin = Math.ceil(tmin);
      const ctmax = Math.ceil(tmax);
      const secondTicks = g.append('g');
      const { height } = yAxis.node().getBoundingClientRect();
      for (let t = ctmin; t < ctmax; t++) {
        secondTicks.append('line')
                   .attr({x1: x(t), y1: 0})
                   .attr({x2: x(t), y2: height})
                   .attr('stroke-width', 1)
                   .attr('stroke', '#999');
      }
      return secondTicks;
    };
    const drawZeroLine = (g, tmin, tmax) => {
      return g.append('line')
              .attr({ x1: x(tmin), y1: y(0)})
              .attr({ x2: x(tmax), y2: y(0)})
              .attr('stroke-width', 1)
              .attr('stroke', '#555');
    };
    this.drawn.forEach(drawn => { drawn.tagged = false; });
    if (this.drawn.length > 0) {
      this.drawn[this.drawn.length - 1].svg.attr('class', 'signal-plot-item');
    }
    let numPoints = -1;
    this.props.selected.forEach((region) => {
      region.points.forEach((point) => {
        numPoints++;
        if (numPoints < (PLOTS_PER_PAGE - 1) * this.state.page ||
            numPoints > (PLOTS_PER_PAGE - 1) * (this.state.page + 1)
        ) {
          return;
        }
        // Only filter out array indices where time values in the domain are in bounds.
        const indexFilter = (indexes, t, i) => {
          if (t >= tmin && t <= tmax) {
            indexes.push(i)
          }
          return indexes;
        }
        const indexes = point.domain.reduce(indexFilter, []);
        const drawn = this.drawn.find(d => d.point === point)
        if (drawn) {
          const { g, sigLine, secondTicks, zeroLine, yAx } = drawn;
          sigLine.remove();
          secondTicks.remove();
          zeroLine.remove();
          yAx.call(yAxis);
          drawn.sigLine = drawSignalLine(g, point, indexes);
          drawn.secondTicks = drawSecondTicks(g, yAx, tmin, tmax);
          drawn.zeroLine = drawZeroLine(g, tmin, tmax);
          drawn.tagged = true;
          return;
        }
        const svg = d3.select(this.container)
                      .append('svg')
                      .attr('class', 'signal-plot-item')
                      .attr('height', HEIGHT);
        const g = svg.append('g')
                     .attr('transform', `translate(${30}, ${0})`);
        const rect = g.append('rect')
                      .attr('width', '100%')
        const yAx = g.append('g')
                     .call(yAxis);
        const { height } = yAx.node().getBoundingClientRect();
        rect.attr('height', height);
        const sigLine = drawSignalLine(g, point, indexes);
        const secondTicks = drawSecondTicks(g, yAx, tmin, tmax);
        const zeroLine = drawZeroLine(g, tmin, tmax);
        this.drawn.push({
          point,
          svg,
          rect,
          g,
          sigLine,
          secondTicks,
          zeroLine,
          yAx,
          tagged: true });
      });
    });
    this.drawn.forEach((drawn, i) => {
      if(!drawn.tagged) {
        drawn.svg.remove();
      }
    });
    this.drawn = this.drawn.filter(drawn => drawn.tagged);
    this.drawn.forEach((drawn, i) => {
      if (i % 2 === 1) {
        drawn.rect.attr('fill', '#eee');
        return
      }
      drawn.rect.attr('fill', '#fff');
    });
    const drawXaxis = (orientation, drawn, xoffset, yoffset) => {
      const xAxis = d3.svg.axis()
                      .scale(x)
                      .ticks(10)
                      .outerTickSize(0)
                      .orient(orientation);
      return drawn.g.append('g')
                    .call(xAxis)
                    .attr('transform', `translate(${xoffset}, ${yoffset})`);
    };
    if (this.drawn.length > 0) {
      this.xAxisTop = drawXaxis('bottom', this.drawn[0], 0, 0);
      this.xAxisBottom = drawXaxis('bottom', this.drawn[this.drawn.length - 1], 0, HEIGHT);
      this.drawn[this.drawn.length - 1].svg.attr('class', 'signal-plot-item last-plot')
    }
    d3.select(this.container)
      .selectAll('.domain')
      .attr("fill", 'none')
      .attr('stroke', 'black')
      .attr('stroke-width', 1.5);
  }
  render() {
    const onWheel = (dy) => {
      const { tmin, tmax } = this.state.bounds;
      if (tmax - tmin <= 5 && dy < 0) {
        return;
      }
      if (tmax - tmin >= 65 && dy > 0) {
        return;
      }
      this.setState({
        bounds: {
          tmin: tmin - Math.sign(dy) * ZOOM_AMOUNT * (tmax - tmin) / 15,
          tmax: tmax + Math.sign(dy) * ZOOM_AMOUNT * (tmax - tmin) / 15
        }
      });
    };
    const onMouseMove = (dx) => {
      if (!this.lastMouseX) {
        return; // If no lastMouseX then the mouse is not clicked.
      }
      const width = this.width || 1.0;
      const { tmin, tmax } = this.state.bounds;
      this.lastMouseX += dx;
      this.setState({
        bounds: {
          tmin: tmin - dx * INTERVAL_MOVE_AMOUNT * (tmax - tmin) / width,
          tmax: tmax - dx * INTERVAL_MOVE_AMOUNT * (tmax - tmin) / width
        }
      });
    };
    const enabled = (text, incr) => (
      <div
        className="signal-plots-button"
        onClick={() => { this.setState({ page: this.state.page + incr }); }}
      >
        {text}
      </div>
    );
    const disabled = (text) => (
      <div className="signal-plots-button disabled">
        {text}
      </div>
    );
    const numPoints = countNumPoints(this.props.selected);
    const showNext = this.state.page < Math.floor(numPoints / PLOTS_PER_PAGE);
    const showPrev = this.state.page > 0;
    return (
      <div className="signal-plots-container">
        <div className="signal-plots-buttons">
          {showPrev ? enabled('Previous', -1) : disabled('Previous')}
          {showNext ? enabled('Next', +1) : disabled('Next')}
          <div className="signal-plots-page-number">Page: {this.state.page + 1}</div>
        </div>
        <div
          className="signal-plots"
          ref={(container) => { this.container = container; }}
          onWheel={(e) => { if (e.shiftKey) { e.preventDefault(); onWheel(e.deltaY); } }}
          onMouseDown={(e) => { if (e.button === 0) { this.lastMouseX = e.clientX; } }}
          onMouseMove={(e) => { onMouseMove(e.clientX - this.lastMouseX); }}
        >
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
