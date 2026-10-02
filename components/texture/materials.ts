/* eslint-disable react/react-compiler -- Three.js node materials use imperative APIs. */

import * as THREE from 'three';
import {
  fract,
  floor,
  max,
  mix,
  pow,
  sin,
  step,
  texture,
  uv,
  vec2,
  vec3,
} from 'three/tsl';
import { MeshPhysicalNodeMaterial, type Node } from 'three/webgpu';

import { createFabricMaterial } from '@/lib/fabric-material';

import type { ViewerSettings } from './config';

function stochasticOffset(position: Node<'vec2'>) {
  const randomAngles = vec2(
    position.dot(vec2(127.1, 311.7)),
    position.dot(vec2(269.5, 183.3)),
  );
  return fract(sin(randomAngles).mul(43758.5453));
}

function createStochasticColorNode(
  map: THREE.Texture,
  repeat: number | readonly [number, number],
) {
  const [repeatU, repeatV] =
    typeof repeat === 'number' ? [repeat, repeat] : repeat;
  const sampleUv = uv().mul(vec2(repeatU, repeatV));
  const scaledUv = sampleUv.mul(2 * Math.sqrt(3));
  const skewedUv = vec2(
    scaledUv.x.sub(scaledUv.y.mul(0.57735027)),
    scaledUv.y.mul(1.15470054),
  );
  const baseCell = floor(skewedUv);
  const cellUv = fract(skewedUv);
  const thirdCoordinate = cellUv.x.oneMinus().sub(cellUv.y);
  const upperTriangle = step(0, thirdCoordinate.negate());
  const triangleSign = upperTriangle.mul(2).sub(1);
  const weight1 = thirdCoordinate.negate().mul(triangleSign);
  const weight2 = upperTriangle.sub(cellUv.y.mul(triangleSign));
  const weight3 = upperTriangle.sub(cellUv.x.mul(triangleSign));
  const vertex1 = baseCell.add(vec2(upperTriangle, upperTriangle));
  const vertex2 = baseCell.add(vec2(upperTriangle, upperTriangle.oneMinus()));
  const vertex3 = baseCell.add(vec2(upperTriangle.oneMinus(), upperTriangle));
  const gradientX = sampleUv.dFdx();
  const gradientY = sampleUv.dFdy();
  const color1 = texture(map, sampleUv.add(stochasticOffset(vertex1))).grad(
    gradientX,
    gradientY,
  ).rgb;
  const color2 = texture(map, sampleUv.add(stochasticOffset(vertex2))).grad(
    gradientX,
    gradientY,
  ).rgb;
  const color3 = texture(map, sampleUv.add(stochasticOffset(vertex3))).grad(
    gradientX,
    gradientY,
  ).rgb;
  const luma = vec3(0.2126, 0.7152, 0.0722);
  const luminanceWeights = vec3(
    color1.dot(luma),
    color2.dot(luma),
    color3.dot(luma),
  );
  const barycentricWeights = vec3(weight1, weight2, weight3);
  const weightedLuminance = mix(vec3(1), luminanceWeights, 0.6);
  const initialWeights = weightedLuminance.mul(pow(barycentricWeights, 7));
  const normalizedWeights = initialWeights.div(
    initialWeights.x.add(initialWeights.y).add(initialWeights.z),
  );
  const gainExponent = Math.log(1 - 0.7) / Math.log(0.5);
  const gainSide = step(0.5, normalizedWeights).mul(2);
  const gainDirection = gainSide.oneMinus().mul(2);
  const gainBase = max(
    vec3(0),
    gainSide.add(normalizedWeights.mul(gainDirection)),
  );
  const gainedWeights = gainSide
    .mul(0.5)
    .add(gainDirection.mul(0.25).mul(pow(gainBase, gainExponent)));
  const finalWeights = gainedWeights.div(
    gainedWeights.x.add(gainedWeights.y).add(gainedWeights.z),
  );
  return color1
    .mul(finalWeights.x)
    .add(color2.mul(finalWeights.y))
    .add(color3.mul(finalWeights.z));
}

export function createTextileMaterial(
  textures: THREE.Texture[],
  settings: ViewerSettings,
  repeat: number | readonly [number, number],
  stochasticTiling: boolean,
) {
  if (!stochasticTiling) return createFabricMaterial(textures, settings);
  const [map, roughnessMap, normalMap, displacementMap, aoMap] = textures;
  if (!map)
    throw new Error('The selected fabric bundle does not contain a color map.');
  const material = new MeshPhysicalNodeMaterial({
    roughness: settings.roughness,
    roughnessMap,
    normalMap,
    displacementMap,
    aoMap,
    clearcoat: settings.clearcoat,
    clearcoatRoughness: 0.22,
    normalScale: new THREE.Vector2(settings.normalScale, settings.normalScale),
    displacementScale: settings.displacement,
    envMapIntensity: settings.envIntensity,
  });
  material.colorNode = createStochasticColorNode(map, repeat);
  return material;
}
