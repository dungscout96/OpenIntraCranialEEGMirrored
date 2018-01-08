
// Since voxels are 16 bit we ca
function makeGLTextureViews(data) {
  const gl = document.createElement('canvas').getContext('experimental-webgl');
  const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const maxVoxels = maxTexSize * maxTexSize;
  const nbTexturesUsed = Math.ceil(data.length / maxVoxels);
  const textureSize = new Array(nbTexturesUsed);
  const textures = new Array(nbTexturesUsed);
  for (let i = 0; i < nbTexturesUsed; i += 1) {
    textureSize[i] = [maxTexSize, maxTexSize];
    if (i >= nbTexturesUsed - 1) {
      textureSize[i][1] = Math.ceil(data.length / maxTexSize);
      if (textureSize[i][1] <= 1) {
        textureSize[i][0] = Math.ceil(data.length % maxTexSize);
      } else {
        textureSize[i][0] = maxTexSize;
      }
    }
    const texdata = new Uint8Array(textureSize[i][0] * textureSize[i][1]).fill(0);
    for (let j = 0; j < texdata.length; j += 1) {
      texdata[j] = data[(i * maxVoxels) + j];
    }
    textures[i] = new THREE.DataTexture(
      texdata,
      textureSize[i][0],
      textureSize[i][1],
      THREE.LuminanceFormat
    );
    textures[i].needsUpdate = true;
  }
  return { textures, textureSize, nbTexturesUsed };
}

export default class MRIOverlay {
  constructor(name, image3d) {
    this.name = name;
    this.image3d = image3d;
    this.colorMapName = null;
    this.weight = 1.0;
    this.timeIndex = 0;
    const timeDim = image3d.getMetadata('dimensions').find(d => d.nameWorldSpace === 't');
    this.maxTimeIndex = timeDim ? timeDim.length - 1 : 0;
    const { textures, textureSize, nbTexturesUsed } = makeGLTextureViews(image3d.getDataUint8());
    const { min, max } = image3d.getTransfoBox('v2w');
    this.uniforms = {
      worldMin: [min.x, min.y, min.z],
      worldMax: [max.x, max.y, max.z],
      w2v: image3d.getMetadata('transformations').w2v,
      swapMat: image3d.getVoxelCoordinatesSwapMatrix(true),
      stride: image3d.getMetadata('dimensions').map(R.prop('stride')).slice(0, 3).reverse(),
      dimensions: image3d.getMetadata('dimensions').map(R.prop('length')).slice(0, 3).reverse(),
      weight: this.weight,
      timeIndex: this.timeIndex,
      timeStride: timeDim ? timeDim.stride : 0,
      nbTexturesUsed,
      textureSize,
      textures,
      colorMap: null,
      enableColorMap: 0
    };
  }
  getColormapName() {
    return this.colorMapName;
  }
  setColormapName(name) {
    this.colorMapName = name;
  }
  getWeight() {
    return this.weight;
  }
  setWeight(weight) {
    this.weight = weight;
  }
  getTimeIndex() {
    return this.timeIndex;
  }
  setTimeIndex(timeIndex) {
    this.timeIndex = timeIndex;
  }
  getMaxTime() {
    return this.maxTimeIndex;
  }
  getName() {
    return this.name;
  }
  getImage3D() {
    return this.image3d;
  }
  getUniforms() {
    return this.uniforms;
  }
}
