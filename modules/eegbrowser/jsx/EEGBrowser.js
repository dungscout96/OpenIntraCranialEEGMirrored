import React, { Component } from 'react';
import MRILoader from './MRILoader';

const NUM_REGIONS = 8;
const POINTS_PER_REGION = 30;
const SAMPLES_PER_POINT = 500;
const LOW_PASS_FILTERS = [
  {
    key: 'none',
    label: 'No Filter'
  },
  {
    key: 'lopass15',
    label: 'Low Pass 15Hz'
  },
  {
    key: 'lopass20',
    label: 'Low Pass 20Hz'
  },
  {
    key: 'lopass30',
    label: 'Low Pass 30Hz'
  },
  {
    key: 'lopass40',
    label: 'Low Pass 40Hz'
  }
];

const HIGH_PASS_FILTERS = [
  {
    key: 'none',
    label: 'No Filter'
  },
  {
    key: 'hipass0_5',
    label: 'High Pass 0.5Hz'
  },
  {
    key: 'hipass1',
    label: 'High Pass 1Hz'
  },
  {
    key: 'hipass5',
    label: 'High Pass 5Hz'
  },
  {
    key: 'hipass10',
    label: 'High Pass 10Hz'
  }
];

const FILTERS = {
  lopass15: {
    b: [0.080716994603448, 0.072647596309189, 0.080716994603448],
    a: [1.000000000000000, -1.279860238209870, 0.527812029663189]
  },
  lopass20: {
    b: [0.113997925584386, 0.149768961515167, 0.113997925584386],
    a: [1.000000000000000, -1.036801335341888, 0.436950120418250]
  },
  lopass30: {
    b: [0.192813914343002, 0.325725940431161, 0.192813914343002],
    a: [1.000000000000000, -0.570379950222695, 0.323884080078956]
  },
  lopass40: {
    b: [0.281307434361307, 0.517866041871659, 0.281307434361307],
    a: [1.000000000000000, -0.135289362582513, 0.279792792112445]
  },
  hipass0_5: {
    b: [0.937293010134975, -1.874580964130496, 0.937293010134975],
    a: [1.000000000000000, -1.985579602684723, 0.985739491853153]
  },
  hipass1: {
    b: [0.930549324176904, -1.861078566912498, 0.930549324176904],
    a: [1.000000000000000, -1.971047525054235, 0.971682555986628]
  },
  hipass5: {
    b: [0.877493430773021, -1.754511635757187, 0.877493430773021],
    a: [1.000000000000000, -1.851210698908115, 0.866238657864428]
  },
  hipass10: {
    b: [0.813452161011750, -1.625120853023986, 0.813452161011750],
    a: [1.000000000000000, -1.694160769645868, 0.750559011393507]
  }
}

class Region {
  constructor(name, label, center, color = { r: 0, g: 0, b: 0 }) {
    this.name = name;
    this.label = label;
    this.color = color;
    this.points = [];
    this.generatePoints(POINTS_PER_REGION, center);
  }
  generatePoints(numPoints, center) {
    for (let i = 0; i < numPoints; i += 1) {
      const point = new Array(3).fill(0).map(() => (2.0 * Math.random() - 1.0) / NUM_REGIONS);
      point[0] += center[0]
      point[1] += center[1]
      point[2] += center[2]
      this.points.push(new Point(`${this.name} : point_${i}`, point, SAMPLES_PER_POINT));
    }
  }
}

class Point {
  constructor(name, position, timeSamples, tmin = 0, tmax = 60) {
    this.name = name;
    this.tmin = tmin;
    this.tmax = tmax;
    this.domain = new Float32Array(timeSamples).fill(0);
    this.domain.forEach((_, i) => {
      const t = i / timeSamples;
      this.domain[i] = tmin * (1 - t) + tmax * t;
    });
    this.originalSignal = new Float32Array(timeSamples).fill(0);
    this.originalSignal.forEach((_, i) => {
      this.originalSignal[i] = 2.0 * Math.random() - 1.0;
    });
    this.position = position;
    this.hovered = false;
    this.signal = this.originalSignal;
    this.filters = {};
  }
  applyFilter(lowPassFilterName, highPassFilterName) {
    if (this.filters.low === lowPassFilterName && this.filters.hi === highPassFilterName) {
      return; // Don't apply filters more than once
    }
    const diffFilter = new differenceequationsignal1d.DifferenceEquationSignal1D();
    diffFilter.enableBackwardSecondPass
    const doFilterUpdate = (coefficients, input) => {
      if (coefficients) {
        diffFilter.setInput(input);
        diffFilter.setACoefficients(coefficients.a);
        diffFilter.setBCoefficients(coefficients.b);
        diffFilter.run() // eventually should be pixpipe's update()
        this.signal = diffFilter.getOutput(); 
        return;
      }
      this.signal = input;
    };
    doFilterUpdate(FILTERS[lowPassFilterName], this.originalSignal);
    doFilterUpdate(FILTERS[highPassFilterName], this.signal);
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
      const c = region.color;
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

const countNumPoints = regions => regions.map(r => r.points.length).reduce((a,b) => a + b, 0);

class SignalPlots extends Component {
  constructor(props) {
    super(props);
    this.lastMouseX = null;
    this.drawn = [];
    this.state = {
      cursorX: null,
      bounds: { tmin: -0.1, tmax: 25 },
      filters: { low: 'none', hi: 'none' },
      group: 0
    };
  }
  componentWillReceiveProps(nextProps) {
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    const numPlots = countNumPoints(nextProps.selected);
    const newGroup = minPlot > numPlots ? Math.floor(numPlots / PLOTS_PER_GROUP) : this.state.group;
    this.setState({ group : newGroup });
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
    let pageUpdate = false;
    if (this.state.group !== this.lastGroup) {
      this.lastGroup = this.state.group;
      pageUpdate = true;
    }
    const x = d3.scale.linear()
                .domain([tmin, tmax])
                .rangeRound([0, this.width]);
    const xInv = d3.scale.linear()
                .domain([0, this.width])
                .range([tmin, tmax]);
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
    const drawCursorTick = (g, yAxis, x) => {
      const { height } = yAxis.node().getBoundingClientRect();
      return g.append('line')
              .attr({x1: x, y1: 0})
              .attr({x2: x, y2: height})
              .attr('stroke-width', 1)
              .attr('stroke', '#900');
    }
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
        if (numPoints < (PLOTS_PER_GROUP - 1) * this.state.group ||
            numPoints > (PLOTS_PER_GROUP - 1) * (this.state.group + 1)
        ) {
          return;
        }
        point.applyFilter(this.state.filters.low, this.state.filters.hi);
        // Only filter out array indices where time values in the domain are in bounds.
        let cursIndex = null;
        let cursTime = 'NA';
        let cursVal = 'NA';
        if (this.state.cursorX) {
          cursTime = Math.floor(xInv(this.state.cursorX) * 100) / 100;
        }
        const ts = point.domain;
        const indexFilter = (indexes, t, i) => {
          if (cursTime !== 'NA') {
            if (i < ts.length + 1 && i < point.signal.length && cursTime >= t && cursTime < ts[i+1]) {
              cursVal = Math.floor(point.signal[i] * 100) / 100;
            }
          }
          if (t >= tmin && t <= tmax) {
            indexes.push(i)
          }
          return indexes;
        }
        const indexes = ts.reduce(indexFilter, []);
        const drawn = this.drawn.find(d => d.point === point)
        if (!pageUpdate && drawn) {
          const { g, sigLine, secondTicks, zeroLine, yAx } = drawn;
          sigLine.remove();
          if (drawn.cursorTick) {
            drawn.cursorTick.remove();
          }
          secondTicks.remove();
          zeroLine.remove();
          yAx.call(yAxis);
          drawn.pointName.text(`${point.name} | time: ${cursTime}s | value: ${cursVal}uV`);
          drawn.sigLine = drawSignalLine(g, point, indexes);
          drawn.secondTicks = drawSecondTicks(g, yAx, tmin, tmax);
          if (this.state.cursorX) {
            drawn.cursorTick = drawCursorTick(g, yAx, this.state.cursorX);
          }
          drawn.zeroLine = drawZeroLine(g, tmin, tmax);
          drawn.tagged = true;
          return;
        }
        // Create new plot shapes in d3
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
        const c = region.color;
        const regionColorCode = svg.append('line')
                                   .attr({ x1: 5, y1: 0 })
                                   .attr({ x2: 5, y2: height })
                                   .attr('stroke-width', 4)
                                   .attr('stroke', `rgba(${c.r}, ${c.g}, ${c.b}, 1.0)`);
        const pointName = g.append('text')
                           .attr('x', 5)
                           .attr('y', height - 6)
                           .attr('font-size', 13)
                           .text(`${point.name} | time: ${cursTime}s | value: ${cursVal}uV`);
        rect.attr('height', height);
        const sigLine = drawSignalLine(g, point, indexes);
        let cursorTick = null;
        if (this.state.cursorX) {
          cursorTick = drawCursorTick(g, yAx, this.state.cursorX);
        }
        const secondTicks = drawSecondTicks(g, yAx, tmin, tmax);
        const zeroLine = drawZeroLine(g, tmin, tmax);
        this.drawn.push({
          point,
          svg,
          rect,
          g,
          pointName,
          sigLine,
          cursorTick,
          secondTicks,
          zeroLine,
          yAx,
          tagged: true
	});
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
      this.xAxisTop.append('text')
                   .attr('x', -23)
                   .attr('y', 10)
                   .text('uV');
      this.xAxisBottom = drawXaxis('bottom', this.drawn[this.drawn.length - 1], 0, HEIGHT);
      this.xAxisBottom.append('text')
                      .attr('x', 5)
                      .attr('y', 28)
                      .text('time (sec)');
      this.xAxisBottom.append('text')
                      .attr('x', -23)
                      .attr('y', 7)
                      .text('uV');
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
    const onMouseDown = (shift, leftClick, clientX, target) => {
      const { left } = target.getBoundingClientRect();
      if (shift && leftClick) {
        this.lastMouseX = clientX;
        return;
      }
      if (!shift && leftClick) {
        this.setState({ cursorX: clientX - left });
      }
    }
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
    const numPoints = countNumPoints(this.props.selected);
    const minPlot = (PLOTS_PER_GROUP - 1) * this.state.group;
    let maxPlot = (PLOTS_PER_GROUP - 1) * (this.state.group + 1);
    const showNext = maxPlot < numPoints
    const showPrev = this.state.group > 0;
    if (minPlot + (PLOTS_PER_GROUP - 1) >= numPoints) {
      maxPlot = maxPlot - (numPoints - (minPlot + (PLOTS_PER_GROUP - 1))) - 1;
    }
    const selectLow = (value) => {
      this.setState({ filters: { low: value, hi: this.state.filters.hi } });
    };
    const selectHi = (value) => {
      this.setState({ filters: { low: this.state.filters.low, hi: value } });
    };
    return (
      <div className="signal-plots-container">
        <div className="signal-plots-toolbar">
          <div className="signal-plots-buttons">
            {showPrev ? enabled('Previous', -1) : disabled('Previous')}
            {showNext ? enabled('Next', +1) : disabled('Next')}
            <div className="signal-plots-group-number">
              Showing plots: {minPlot + 1} to {maxPlot + 1} out of {numPoints}
            </div>
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
          onMouseDown={(e) => { onMouseDown(e.shiftKey, e.button === 0, e.clientX, e.target); }}
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
