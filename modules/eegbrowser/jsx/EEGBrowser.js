import React, { Component } from 'react';

const NUM_REGIONS = 8;
const POINTS_PER_REGION = 5;
const SAMPLES_PER_POINT = 200;

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
        className={selected ? 'selected-region' : 'unselected-region'}
        onClick={() => onclick(region)}
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

class MRIView extends Component {
  componentDidMount() {
    const { width, height } = this.canvas.getBoundingClientRect();
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    renderer.setSize(width, height);
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    this.camera.position.z = 3;
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.scene = new THREE.Scene();
    this.attachPoints();
    const self = this;
    function run() {
      renderer.render(self.scene, self.camera);
      window.requestAnimationFrame(run.bind(self));
    }
    run();
  }
  componentDidUpdate() {
    this.attachPoints();
  }
  attachPoints() {
    while(this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    const material = new THREE.MeshBasicMaterial({ color: 0x34A853 });
    const geometry = new THREE.SphereBufferGeometry(1 / (NUM_REGIONS * 10) , 8, 8);
    this.props.regions.forEach((region) => {
      region.points.forEach((point) => {
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        mesh.position.fromArray(point.position);
      });
    });
  }
  render() {
    return (
      <canvas
        className="mri-view"
        width="450"
        height="400"
        ref={(canvas) => { this.canvas = canvas; }}
      />
    )
  }
}

class SignalPlots extends Component {
  componentDidMount() {
    this.renderPlots();
  }
  componentDidUpdate() {
    this.renderPlots();
  }
  renderPlots() {
    const WIDTH = 400;
    const HEIGHT = 200;
    d3.select(this.container)
      .selectAll('svg')
      .remove();
    this.props.regions.forEach((region) => {
      region.points.forEach((point) => {
        const { tmin, tmax } = point;
        const idx = point.domain.map((_, i) => i);
        const x = d3.scale.linear()
                    .domain([tmin, tmax])
                    .rangeRound([0, WIDTH]);
        const y = d3.scale.linear()
                    .domain([-2.0, 2.0])
                    .rangeRound([HEIGHT / 1.6, 0]);
        const line = d3.svg.line()
                       .x(i => x(point.domain[i]))
                       .y(i => y(point.signal[i]));
        const g = d3.select(this.container)
                    .append('svg')
                      .attr('width', WIDTH)
                      .attr('height', HEIGHT)
                      .append('g')
                      .attr('transform', `translate(${60}, ${10})`);
        const xAxis = d3.svg.axis()
                        .scale(x)
                        .ticks(20)
                        .orient('bottom');
        const yAxis = d3.svg.axis()
                        .scale(y)
                        .ticks(5)
                        .orient('left');
        g.append('g')
         .call(xAxis)
         .attr('transform', `translate(${0.2}, ${HEIGHT / 2 + 25})`);
        g.append('g')
         .call(yAxis);
        g.selectAll('.domain')
         .attr("fill", 'none')
         .attr('stroke', 'black')
         .attr('stroke-width', 1.5);
        g.append('path')
         .attr('fill', 'none')
         .attr('stroke', 'steelblue')
         .attr('stroke-linejoin', 'round')
         .attr('stroke-linecap', 'round')
         .attr('stroke-width', 1.5)
         .attr('d', line(idx));
      });
    });
  }
  render() {
    return (
      <div
        className="signal-plots"
        ref={(container) => { this.container = container; }}
      >
      </div>
    );
  }
}

export default class EEGBrowser extends Component {
  constructor(props) {
    super(props);
    this.state = {
      regions: makeRegions(NUM_REGIONS),
      selected: [],
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
    return (
      <div className="eeg-browser">
        <RegionSelect
          regions={this.state.regions}
          selected={this.state.selected}
          unselectRegion={unselectRegion}
          selectRegion={selectRegion}
        >
        </RegionSelect>
        <MRIView regions={this.state.selected}></MRIView>
        <SignalPlots regions={this.state.selected}></SignalPlots>
      </div>
    );
  }
}

window.EEGBrowser = React.createFactory(EEGBrowser);
