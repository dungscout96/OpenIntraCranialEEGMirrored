import React, { Component } from 'react';
import MRILoader from './MRILoader';

/* eslint-disable no-undef, react/jsx-no-undef */

const MESH_SIZE = 1/80;

const WHITE = 0xFFFFFF;
const GRAY = 0x333333;
const BLUE = 0x4285F4;
export class MRIViewer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showElectrodes: false,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
    }
    this.mouse = new THREE.Vector2();
    this.rayCaster = new THREE.Raycaster();
    this.selectRegionAtMouse = this.selectRegionAtMouse.bind(this);
    this.displacementFromRegion = new THREE.Vector3();
  }
  selectRegionAtMouse(event) {
    if (event.button !== 2) {
      return;
    }
    event.preventDefault();
    if (!this.camera || !this.mriLoader.system) {
      return;
    }
    this.rayCaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.rayCaster.intersectObjects(this.mriLoader.system.children);
    if (intersects.length === 0) {
      return;
    }
    const hitPoint = intersects[0].point;
    let minDistance = -Infinity;
    let minRegion;
    this.props.regions.forEach((region, i) => {
      region.channels.forEach((channel) => {
        this.displacementFromRegion.subVectors(channel.metaData.position, hitPoint);
        const distance = this.displacementFromRegion.length();
        if (!minRegion || minDistance > distance) {
          minRegion = region;
          minDistance = distance;
        }
      })
    })
    if (this.props.selected.find(r => r === minRegion)) {
      this.props.unselectRegions([minRegion]);
      return;
    }
    this.props.selectRegions([minRegion]);
  }
  componentWillReceiveProps(newProps) {
    if (!this.initialized && !this.props.showMRI && newProps.showMRI) {
      this.initialized = true;
      const width = 300;
      const height = 250;
      const renderer = new THREE.WebGLRenderer();
      renderer.setClearColor(new THREE.Color(1.0, 1.0, 1.0, 1.0));
      const self = this;
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
      delete this.camControls.mouseButtons['PAN'];
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
            mesh.position.copy(channel.metaData.position);
            mesh.visible = this.state.showElectrodes;
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
  }
  setVisibility() {
    this.props.regions.forEach((region, i) => {
      region.channels.forEach((channel) => {
        if (this.meshes[i]) {
          this.meshes[i].forEach(mesh => { mesh.visible = this.state.showElectrodes; });
        }
      })
    });
  }
  componentDidUpdate() {
    this.addCanvas();
    if (!this.initialized) {
      return;
    }
    this.setVisibility();
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
          <div
            onMouseDown={this.selectRegionAtMouse}
            ref={(div) => { this.container = div; }}>
          </div>
          <div className="mri-controls">
              <h4>Hold R to rotate or T to translate the planes.</h4>
          </div>
          <div className="mri-controls">
            <div
              className="round-button"
              onClick={() => { this.setState({ showElectrodes: !this.state.showElectrodes }) }}
            >
              {this.state.showElectrodes ? 'Hide' : 'Show'} Electrodes
            </div>
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
