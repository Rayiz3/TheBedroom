import assert from 'node:assert/strict';
import test from 'node:test';

import * as THREE from 'three';

import { calculateUvDensityRepeat } from '../lib/uv-density.mjs';

function createUvMappedPlane() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([
      0, 0, 0,
      0, 0, 4,
      2, 0, 0,
      2, 0, 0,
      0, 0, 4,
      2, 0, 4,
    ], 3),
  );
  geometry.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute([
      0, 0,
      0, 1,
      0.5, 0,
      0.5, 0,
      0, 1,
      0.5, 1,
    ], 2),
  );
  return new THREE.Mesh(geometry);
}

test('derives repeat values from rendered geometry and authored UV density', () => {
  const root = new THREE.Group();
  const mesh = createUvMappedPlane();
  root.add(mesh);

  assert.deepEqual(calculateUvDensityRepeat(root, [mesh], 0.5), [8, 8]);
});

test('includes the final model scale when preserving patch size', () => {
  const root = new THREE.Group();
  const mesh = createUvMappedPlane();
  root.scale.set(2, 1, 1);
  root.add(mesh);

  assert.deepEqual(calculateUvDensityRepeat(root, [mesh], 0.5), [16, 8]);
});
