export const VERTEX = `
  precision highp float;

  varying vec4 worldCoord;

  void main( void )
  {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_Position = projectionMatrix * mvPosition;
    worldCoord = modelMatrix * vec4( position, 1.0 );
  }
`;

export const FRAGMENT = (nbTextures, numMRIs) => `
  precision highp float;


  // Use trinlinear interpolation
  uniform bool trilinearInterpolation;

  // texture that represent the curve data to look up
  uniform sampler2D contrastTexture;

  // enable contrast curve
  uniform bool enableConstrast;

  // brightness factor of the voxels
  uniform float brightness;

  // voxel -> world and world -> voxel transforms
  uniform vec3 worldMin;
  uniform vec3 worldMax;
  uniform mat4 w2v[${numMRIs}];
  uniform mat3 swapMat[${numMRIs}];
  uniform vec3 stride[${numMRIs}];
  uniform vec3 dimensions[${numMRIs}];

  // sampling weights
  uniform float weight[${numMRIs}];

  // Time index and stride for fMRI
  uniform float timeIndex[${numMRIs}];
  uniform float timeStride[${numMRIs}];

  // number of textures used, and texture array offset of the volumes
  uniform int nbTexturesUsed[${numMRIs}];
  uniform int textureOffsets[${numMRIs}];

  // buffer sizes and textures array containing all the volumetric data.
  uniform vec2 textureSize[${nbTextures}];
  uniform sampler2D textures[${nbTextures}];

  // color map textures
  uniform sampler2D colorMap[${numMRIs}];

  // enable color maps
  uniform int enableColorMap[${numMRIs}];

  // interpolated fragment values
  varying vec4 worldCoord;

  bool outOfBounds(vec3 pos, vec3 minCoord, vec3 maxCoord)
  {
    return (
      (pos.x <= minCoord.x) || (pos.x >= maxCoord.x) ||
      (pos.y <= minCoord.y) || (pos.y >= maxCoord.y) ||
      (pos.z <= minCoord.z) || (pos.z >= maxCoord.z)
    );
  }

  float getIntensityWorldNearest(
    vec3 voxelPos,
    vec3 dimensions,
    vec3 stride,
    float timeIndex,
    float timeStride,
    int textureOffset,
    int nbTexturesUsed
  )
  {

    float skipped = 0.0;
${loopIntensityWorldNearest(0, nbTextures)}
    return -1.0;
  }
  const float EPSILON = 0.06;
  // return the color corresponding to the given shifted world cooridinates
  // using a neirest neighbors approx (no interpolation)
  void getIntensityWorld(inout vec4 colors[${numMRIs}], vec4 worldCoord)
  {
    float maxIntensity = -1.0;
${loopIntensityWorld(0, numMRIs)}
    if (maxIntensity < 0.0) {
      discard;
    }
  }

  void main( void )
  {
    if (outOfBounds(worldCoord.xyz, worldMin, worldMax))
    {
      discard;
      return;
    }

    // interpolation or not
    vec4 colors[${numMRIs}];
    getIntensityWorld(colors, worldCoord);

    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
${loopIfsFragColor(0, numMRIs)}
    gl_FragColor  = clamp(gl_FragColor, 0.0, 1.0);
  }
`;

function loopIfsFragColor(min, max) {
  let code = '';
  for(let i = min; i < max; i++) {
    code += `
    {
      gl_FragColor += colors[${i}];
    }
    `;
  }
  return code;
}

function loopIntensityWorld(min, max) {
  let code = '';
  for(let i = min; i < max; i++) {
    code += `
      {
        vec3 voxelPos = swapMat[${i}] * (w2v[${i}] * worldCoord).xyz;
        voxelPos = floor(voxelPos);
        float intensity = getIntensityWorldNearest(
          voxelPos,
          dimensions[${i}],
          stride[${i}],
          timeIndex[${i}],
          timeStride[${i}],
          textureOffsets[${i}],
          nbTexturesUsed[${i}]
        );
        if (intensity > maxIntensity) {
          maxIntensity = intensity;
        }
        colors[${i}].rgb = texture2D(colorMap[${i}], vec2(intensity, 0.5)).rgb;
        if (!(enableColorMap[${i}] == 1 && intensity >= EPSILON))
        {
          colors[${i}] = vec4(intensity, intensity, intensity, 1.0);
        } else {
          colors[${i}].a = 1.0;
        }
        if (brightness >= 0.0)
        {
          colors[${i}].rgb = clamp(colors[${i}].rgb * brightness, 0.0, 1.0);
        }
        colors[${i}] *= weight[${i}];
      }
    `;
  }
  return code;
}

function loopIntensityWorldNearest(min, max) {
  let code = '';
  for(let i = min; i < max; i++) {
    code += `
      {
        if (${i} >= textureOffset && ${i} < textureOffset + nbTexturesUsed)
        {
          float bufferSize = floor(textureSize[${i}].x * textureSize[${i}].y);
          if (outOfBounds(voxelPos, vec3(0.0, 0.0, 0.0), dimensions))
          {
            skipped += bufferSize;
          }
          float offset = floor(dot(voxelPos, stride));
          offset += timeIndex * timeStride;
          offset -= skipped;
          vec2 tex;
          tex.x = mod(offset, textureSize[${i}].x) + 0.5;
          tex.y = floor(offset / textureSize[${i}].x) + 0.5;
          tex = tex / textureSize[${i}];
          vec4 color = texture2D(textures[${i}], tex);
          if (!(outOfBounds(voxelPos, vec3(0.0, 0.0, 0.0), dimensions))) {
            return color.r;
          }
        }
      }
    `;
  }
  return code;
}
