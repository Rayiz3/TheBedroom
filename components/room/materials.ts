import * as THREE from 'three';

export function enableStochasticFabricColor(
  material: THREE.MeshPhysicalMaterial,
) {
  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  const previousProgramCacheKey = material.customProgramCacheKey.bind(material);

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>

vec2 fabricStochasticOffset( vec2 position ) {
  return fract( sin( vec2(
    dot( position, vec2( 127.1, 311.7 ) ),
    dot( position, vec2( 269.5, 183.3 ) )
  ) ) * 43758.5453 );
}

vec3 sampleStochasticFabric( sampler2D sourceMap, vec2 sampleUv ) {
  // Match Texture view's .grad(): derive mip level from continuous UVs,
  // before applying the discontinuous random offsets.
  vec2 gradientX = dFdx( sampleUv );
  vec2 gradientY = dFdy( sampleUv );
  vec2 scaledUv = sampleUv * 3.46410162;
  vec2 skewedUv = vec2(
    scaledUv.x - scaledUv.y * 0.57735027,
    scaledUv.y * 1.15470054
  );
  vec2 baseCell = floor( skewedUv );
  vec2 cellUv = fract( skewedUv );
  float thirdCoordinate = 1.0 - cellUv.x - cellUv.y;
  float upperTriangle = step( 0.0, -thirdCoordinate );
  float triangleSign = upperTriangle * 2.0 - 1.0;

  vec3 barycentricWeights = vec3(
    -thirdCoordinate * triangleSign,
    upperTriangle - cellUv.y * triangleSign,
    upperTriangle - cellUv.x * triangleSign
  );
  vec2 vertex1 = baseCell + vec2( upperTriangle );
  vec2 vertex2 = baseCell + vec2( upperTriangle, 1.0 - upperTriangle );
  vec2 vertex3 = baseCell + vec2( 1.0 - upperTriangle, upperTriangle );

  vec3 color1 = textureGrad( sourceMap, sampleUv + fabricStochasticOffset( vertex1 ), gradientX, gradientY ).rgb;
  vec3 color2 = textureGrad( sourceMap, sampleUv + fabricStochasticOffset( vertex2 ), gradientX, gradientY ).rgb;
  vec3 color3 = textureGrad( sourceMap, sampleUv + fabricStochasticOffset( vertex3 ), gradientX, gradientY ).rgb;
  vec3 luminance = vec3(
    dot( color1, vec3( 0.2126, 0.7152, 0.0722 ) ),
    dot( color2, vec3( 0.2126, 0.7152, 0.0722 ) ),
    dot( color3, vec3( 0.2126, 0.7152, 0.0722 ) )
  );
  vec3 initialWeights = mix( vec3( 1.0 ), luminance, 0.6 )
    * pow( max( barycentricWeights, vec3( 0.0 ) ), vec3( 7.0 ) );
  vec3 normalizedWeights = initialWeights
    / ( initialWeights.x + initialWeights.y + initialWeights.z );

  float gainExponent = log( 0.3 ) / log( 0.5 );
  vec3 gainSide = step( vec3( 0.5 ), normalizedWeights ) * 2.0;
  vec3 gainDirection = ( vec3( 1.0 ) - gainSide ) * 2.0;
  vec3 gainBase = max(
    vec3( 0.0 ),
    gainSide + normalizedWeights * gainDirection
  );
  vec3 gainedWeights = gainSide * 0.5
    + gainDirection * 0.25 * pow( gainBase, vec3( gainExponent ) );
  vec3 finalWeights = gainedWeights
    / ( gainedWeights.x + gainedWeights.y + gainedWeights.z );

  return color1 * finalWeights.x
    + color2 * finalWeights.y
    + color3 * finalWeights.z;
}`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
  vec4 sampledDiffuseColor = vec4(
    sampleStochasticFabric( map, vMapUv ),
    texture2D( map, vMapUv ).a
  );
  diffuseColor *= sampledDiffuseColor;
#endif`,
      );
  };
  material.customProgramCacheKey = () =>
    `${previousProgramCacheKey()}|stochastic-fabric-color-grad-v2`;
}
