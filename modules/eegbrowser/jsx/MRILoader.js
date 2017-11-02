import { VERTEX, FRAGMENT } from './Shaders';

const MRI_URL = '/eegbrowser/static/full8_400um_optbal.mnc'
export default class MRILoader {
  constructor(scene) {
    this.scene = scene;
  }
  initialize() {
    const textures = [];
    const sliceMatrixSize = {};
    const spaceLength = {};
    const url2buf = new pixpipe.UrlToArrayBufferReader();
    const file2Buff = new pixpipe.FileToArrayBufferReader();
    url2buf.addInput(MRI_URL);
    url2buf.update();
    const self = this;
    return new Promise((resolve) => {
      url2buf.on('ready', function bufferReady() {
        const buffer = this.getOutput();
        var genericDecoder = new pixpipe.Image3DGenericDecoder();
        //var genericDecoder = new pixpipe.Minc2Decoder();
        genericDecoder.addInput( buffer );
        genericDecoder.update();
        // if nothing was decoded, we exit
        if(!genericDecoder.getNumberOfOutputs()){
          console.warn('No output from generic decoder.')
          return;
        }
        const mniVolume = genericDecoder.getOutput();
        if (mniVolume) {
          var mosaicFilter = new pixpipe.Image3DToMosaicFilter();

          // genericDecoder ouputs a pixpipe.MniVolume, which iherit pixpipe.Image3D
          // making it compatible with pixpipe.Image3DToMosaicFilter
          mosaicFilter.addInput( mniVolume );
          // which axis do we want the picture of?
          var space = "zspace";
          mosaicFilter.setMetadata( "axis", space);

          // if time series, take it all
          mosaicFilter.setMetadata("time", -1);
          // run the filter
          mosaicFilter.update();
          if(!mosaicFilter.getNumberOfOutputs()){
            console.warn("No output for mosaicFilter.");
            return;
          }
          // display the output in multiple canvas if needed
          var textures = [];
          for (var nbOut=0; nbOut<mosaicFilter.getNumberOfOutputs(); nbOut++) {
            var outputMosaic = mosaicFilter.getOutput(nbOut);
            console.log( outputMosaic );
            outputMosaic.setMetadata("min", mniVolume.getMetadata("voxel_min"));
            outputMosaic.setMetadata("max", mniVolume.getMetadata("voxel_max"));
            var data = outputMosaic.getDataAsUInt8Array();
            //var data = outputMosaic.getData();
            var texture = new THREE.DataTexture(
              data,
              outputMosaic.getWidth(),
              outputMosaic.getHeight(),
              THREE.LuminanceFormat,
              THREE.UnsignedByteType //THREE.FloatType
            );
            texture.needsUpdate = true;
            textures.push(texture);
          }
          sliceMatrixSize.x = mosaicFilter.getMetadata("gridWidth");
          sliceMatrixSize.y = mosaicFilter.getMetadata("gridHeight");
          spaceLength.x = mniVolume.getMetadata("xspace").space_length;
          spaceLength.y = mniVolume.getMetadata("yspace").space_length;
          spaceLength.z = mniVolume.getMetadata("zspace").space_length;
          spaceLength.t = mniVolume.getTimeLength();
          this.textures = textures;
          this.sliceMatrixSize = sliceMatrixSize;
          this.spaceLength = spaceLength;

          var diagonal = Math.sqrt(spaceLength.x*spaceLength.x + spaceLength.y*spaceLength.y + spaceLength.z*spaceLength.z) * 2;
          var scale = Math.min(spaceLength.x, spaceLength.y, spaceLength.z);
          self.createMRIPlanes({ textures, sliceMatrixSize, spaceLength });
          resolve({ diagonal, scale })
          return;
        }
        console.warn("Non-existant output for genericDecoder.");
        resolve({ diagonal: 1.0, scale: 1.0 });
      });
    })
  }
  getDimensions() {
    return ;
  }
  getShaderMaterial() {
    return this.shaderMaterial;
  }
  createMRIPlanes(params) {
    const { textures, sliceMatrixSize, spaceLength } = params;
    const system = new THREE.Object3D();
    this.shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        // the textures
        nbOfTextureUsed: { type: "i", value: textures.length },
        // the number of slice per row
        nbSlicePerRow: { type: "f", value: sliceMatrixSize.x },
        // the number of slice per column
        nbSlicePerCol: { type: "f", value: sliceMatrixSize.y },
        // the number of slice in total
        nbSliceTotal: { type: "f", value: spaceLength.z },
        // xspace length
        xspaceLength: { type: "f", value: spaceLength.x },
        // yspace length
        yspaceLength: { type: "f", value: spaceLength.y },
        // zspace length
        zspaceLength: { type: "f", value: spaceLength.z },
        // the number of time samples if it's a timeseries
        timespaceLength: { type: "i", value: spaceLength.t },
        timeIndex: { type: "i", value: 0 },
        forcedAlpha: { type: "f", value: 1 },
        textures: { type: "t", value:  textures },
        trilinearInterpol: { type: 'b', value: false },
        curveTexture: { type: "t", value: null },
        enableCurve: { type: 'b', value: false }
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      side: THREE.DoubleSide,
      transparent: true
    });
    var largestSide = Math.sqrt(spaceLength.x*spaceLength.x + spaceLength.y*spaceLength.y + spaceLength.z*spaceLength.z) * 2;
    var zPlaneGeometry = new THREE.PlaneBufferGeometry( largestSide, largestSide, 1 );
    var zPlaneMesh = new THREE.Mesh( zPlaneGeometry, this.shaderMaterial );
    system.add( zPlaneMesh );
    var xPlaneGeometry = new THREE.PlaneBufferGeometry( largestSide, largestSide, 1 );
    var xPlaneMesh = new THREE.Mesh( xPlaneGeometry, this.shaderMaterial );
    xPlaneMesh.rotation.y = Math.PI / 2;
    system.add( xPlaneMesh );
    var zPlaneGeometry = new THREE.PlaneBufferGeometry( largestSide, largestSide, 1 );
    var zPlaneMesh = new THREE.Mesh( zPlaneGeometry, this.shaderMaterial );
    zPlaneMesh.rotation.x = Math.PI / 2;
    system.add(zPlaneMesh);
    this.scene.add(system);
  }
}
