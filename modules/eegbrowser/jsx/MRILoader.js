import ShaderManager from './shader/ShaderManager';
import MRIOverlay from './shader/MRIOverlay';

const MODEL_URL = `${loris.BaseURL}/${loris.TestName}/static/model_mni.nii.gz`;
const LABEL_URL = `${loris.BaseURL}/${loris.TestName}/static/labels_mni.nii.gz`;

export default class MRILoader {
  constructor(scene) {
    this.scene = scene;
    this.shaderManager = new ShaderManager();
    this.colorMapper = new pixpipe.Colormap()
    this.colorMapper.setStyle('jet')
    this.colorMapper.buildLut(39)
  }
  initialize() {
    const promise =
      this.loadFromURL(MODEL_URL)
        .then(() => this.loadFromURL(LABEL_URL))
        .then(() => {
          const colorMap = this.colorMapper.createHorizontalLutImage(false).getData();
          const texture = new THREE.DataTexture(
            new Uint8Array(colorMap),
            colorMap.length / 3,
            1,
            THREE.RGBFormat
          );
          texture.needsUpdate = true;
          this.shaderManager.setArrayUniform('colorMap', 1, texture);
          this.shaderManager.setArrayUniform('enableColorMap', 1, 1);
          this.createMRIPlanes();
        });
    return promise;
  }
  getShaderManager() {
    return this.shaderManager;
  }
  loadFromURL(url) {
    const url2buf = new pixpipe.UrlToArrayBufferReader();
    url2buf.addInput(url);
    url2buf.update();
    const self = this;
    return new Promise((resolve) => {
      url2buf.on('ready', function bufferReady() {
        const buffer = this.getOutput();
        var genericDecoder = new pixpipe.Image3DGenericDecoderAlt();
        //var genericDecoder = new pixpipe.Minc2Decoder();
        genericDecoder.addInput( buffer );
        genericDecoder.update();
        // if nothing was decoded, we exit
        if(!genericDecoder.getNumberOfOutputs()){
          console.warn('No output from generic decoder.')
          return;
        }
        const mniVolume = genericDecoder.getOutput();
        if (!mniVolume) {
          console.warn("Non-existant output for genericDecoder.");
          return;
        }
        self.shaderManager.addOverlay(new MRIOverlay(url, mniVolume));
        resolve(self.shaderManager);
      });
    });
  }
  createMRIPlanes() {
    this.system = new THREE.Object3D();
    let plane = new THREE.Mesh();
    this.shaderManager.shadePlane(plane);
    this.system.add(plane);
    plane = new THREE.Mesh();
    plane.rotation.y = Math.PI / 2;
    this.shaderManager.shadePlane(plane);
    this.system.add(plane);
    plane = new THREE.Mesh();
    this.shaderManager.shadePlane(plane);
    plane.rotation.x = Math.PI / 2;
    this.system.add(plane);
    this.scene.add(this.system);
  }
}
