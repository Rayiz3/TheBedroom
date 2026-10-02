import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { ThicknessNormals } = await loadTypescript(
  new URL(
    '../components/room/physics/duvet/thickness-normals.ts',
    import.meta.url,
  ),
);

test('thickness normals soften a local crease without mutating simulation normals', () => {
  const source = [
    new THREE.Vector3(1, 0, 0),
    ...Array.from({ length: 3 }, () => new THREE.Vector3(0, 1, 0)),
  ];
  const original = source.map((n) => n.clone());
  const filter = new ThicknessNormals(4, [
    [0, 1, 2],
    [1, 3, 2],
  ]);
  const result = filter.update(source, 4, 0.6);
  assert.ok(result[0].angleTo(result[1]) < source[0].angleTo(source[1]));
  result.forEach((n) => assert.ok(Math.abs(n.length() - 1) < 1e-10));
  source.forEach((n, i) => assert.ok(n.equals(original[i])));
  const first = result.map((n) => n.clone());
  filter
    .update(source, 4, 0.6)
    .forEach((n, i) => assert.ok(n.equals(first[i])));
});

test('flat normals and disabled smoothing preserve thickness direction', () => {
  const source = Array.from({ length: 3 }, () => new THREE.Vector3(0, 1, 0));
  const filter = new ThicknessNormals(3, [[0, 1, 2]]);
  filter.update(source, 4, 0.6).forEach((n) => assert.ok(n.equals(source[0])));
  source[0].set(1, 0, 0);
  filter.update(source, 4, 0).forEach((n, i) => assert.ok(n.equals(source[i])));
});
