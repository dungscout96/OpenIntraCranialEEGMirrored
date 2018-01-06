import React, { Component } from 'react';
import MRILoader from './MRILoader';

const MESH_SIZE = 1/80;

const WHITE = 0xFFFFFF;
const GRAY = 0x333333;
const BLUE = 0x4285F4;
export class MRIViewer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 }
    }
  }
  componentDidMount() {
    const width = 400;
    const height = 350;
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(new THREE.Color(1.0, 1.0, 1.0, 1.0));
    const self = this;
    self.mouse = new THREE.Vector2();
    function run() {
      renderer.render(self.scene, self.camera);
      window.requestAnimationFrame(run);
    }
    this.canvas = renderer.domElement;
    this.canvas.addEventListener('mousemove', (event) => {
      const { top, left, width, height } = self.canvas.getBoundingClientRect();
      const x = event.clientX - left;
      const y = height - (event.clientY - top);
      self.mouse.set(
        2 * x / width - 1,
        2 * y / height - 1
      );
    });
    this.canvas.width = width;
    this.canvas.height = height;
    this.addCanvas()
    renderer.setSize(width, height);
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    this.camControls = new THREE.OrbitControls(this.camera, this.canvas);
    this.camControls.enableKeys = false;
    this.scene = new THREE.Scene();
    this.mriLoader = new MRILoader(this.scene);
    this.meshes = [];
    this.mriLoader.initialize().then(() => {
      this.planeShifter = new PlaneShifter.PlaneShifter(
        this.mriLoader.system,
        this.camera,
        { controls: this.camControls, mouse:this.mouse }
      );
      this.planeShifter.setBoundingBox(this.mriLoader.getShaderManager().getBoundingBox());
      const round = x => Math.floor(x * 100) / 100;
      this.planeShifter.on('translation', () => {
        let { x, y, z } = this.mriLoader.system.position;
        x = round(x);
        y = round(y);
        z = round(z);
        this.setState({ position: { x, y, z } });
      });
      this.planeShifter.on('rotation', () => {
        let { x, y, z } = this.mriLoader.system.rotation;
        const toDeg = rad => (rad / Math.PI) * 180;
        x = round(toDeg(x));
        y = round(toDeg(y));
        z = round(toDeg(z));
        this.setState({ rotation: { x, y, z } });
      });
      const dimensions = this.mriLoader.getShaderManager().getDimensions();
      const { x, y, z } = dimensions;
      const scale = Math.min(x, y, z) / 2;
      const diagonal = dimensions.length();
      this.camera.position.z = diagonal;
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
      const material = new THREE.MeshBasicMaterial({ color: GRAY });
      const geometry = new THREE.SphereBufferGeometry(MESH_SIZE * scale, 8, 8);
      this.props.regions.forEach((region, i) => {
        region.channels.forEach((channel) => {
          const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
          mesh.material.copy(material)
          mesh.position.fromArray(channel.metaData.position);
          this.scene.add(mesh);
          if (!this.meshes[i]) {
            this.meshes[i] = [];
          }
          this.meshes[i].push(mesh);
        });
      });
    });
    run();
  }
  componentDidUpdate() {
    this.addCanvas();
    this.props.regions.forEach((region, i) => {
      region.channels.forEach((channel) => {
        if (this.meshes[i]) {
          this.meshes[i].forEach(m => { m.material.color.setHex(GRAY); });
          if (this.props.selected.find(r => r === region)) {
            this.meshes[i].forEach(m => { m.material.color.setHex(WHITE); });
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
      const changePos = ({ x, y, z }) => {
        if (!this.mriLoader.system) {
          return;
        }
        const position = {
          x: x === undefined ? this.state.position.x : Number(x),
          y: y === undefined ? this.state.position.y : Number(y),
          z: z === undefined ? this.state.position.z : Number(z),
        };
        this.mriLoader.system.position.set(position.x, position.y, position.z);
        this.setState({ position });
      };
      const toRad = deg => (Number(deg) / 180) * Math.PI;
      const changeRot = ({ x, y, z }) => {
        if (!this.mriLoader.system) {
          return;
        }
        const rotation = {
          x: x === undefined ? this.state.rotation.x : x,
          y: y === undefined ? this.state.rotation.y : y,
          z: z === undefined ? this.state.rotation.z : z
        };
        this.mriLoader.system.rotation.set(toRad(rotation.x), toRad(rotation.y), toRad(rotation.z));
        this.setState({ rotation });
      };
      return (
        <div className="mri-view-container">
          <div ref={(div) => { this.container = div; }}>
          </div>
          <div className="mri-controls">
              <h4>Hold R to rotate or T to translate the planes.</h4>
          </div>
          <div className="mri-controls">
            <div>Position:</div>
            <NumericElement name="x" label="x" value={`${this.state.position.x}`} min={-Infinity} max={Infinity} onUserInput={(_, v) => changePos({x: v})}/>
            <NumericElement name="y" label="y" value={`${this.state.position.y}`} min={-Infinity} max={Infinity} onUserInput={(_, v) => changePos({y: v})}/>
            <NumericElement name="z" label="z" value={`${this.state.position.z}`} min={-Infinity} max={Infinity} onUserInput={(_, v) => changePos({z: v})}/>
          </div>
          <div className="mri-controls">
            <div>Rotation:</div>
            <NumericElement name="x" label="x" value={`${this.state.rotation.x}`} min={-180} max={180} onUserInput={(_, v) => changeRot({x: v})}/>
            <NumericElement name="y" label="y" value={`${this.state.rotation.y}`} min={-180} max={180} onUserInput={(_, v) => changeRot({y: v})}/>
            <NumericElement name="z" label="z" value={`${this.state.rotation.z}`} min={-180} max={180} onUserInput={(_, v) => changeRot({z: v})}/>
          </div>
          <div className="mri-controls">
            <div
              className="round-button"
              onClick={() => { changeRot({ x: 0, y: 0, z: 0 }); changePos({ x: 0, y: 0, z: 0 }); }}
            >
              Reset Orientation
            </div>
          </div>
        </div>
      );
    }
    return null;
  }
}
