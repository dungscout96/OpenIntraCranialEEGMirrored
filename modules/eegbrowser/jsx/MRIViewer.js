import React, { Component } from 'react';
import MRILoader from './MRILoader';

const MESH_SIZE = 1/80;

const YELLOW = 0xFF6628;
const GREEN = 0x34A853;
const BLUE = 0x4285F4;
export class MRIViewer extends Component {
  componentDidMount() {
    const width = 400;
    const height = 350;
    const renderer = new THREE.WebGLRenderer();
    this.canvas = renderer.domElement;
    this.canvas.width = width;
    this.canvas.height = height;
    this.addCanvas()
    renderer.setSize(width, height);
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.scene = new THREE.Scene();
    this.mriLoader = new MRILoader(this.scene);
    this.meshes = [];
    this.mriLoader.initialize().then(() => {
      const dimensions = this.mriLoader.getShaderManager().getDimensions();
      const { x, y, z } = dimensions;
      const scale = Math.min(x, y, z) / 2;
      const diagonal = dimensions.length();
      this.camera.position.z = diagonal;
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
      const material = new THREE.MeshBasicMaterial({ color: YELLOW });
      const geometry = new THREE.SphereBufferGeometry(MESH_SIZE * scale, 8, 8);
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
