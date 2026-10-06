import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { isCameraInsideMeshBounds } = await loadTypescript(
  new URL('../components/room/camera-visibility.ts', import.meta.url),
);
test('camera containment follows rotated, scaled architecture and includes its inner half', () => {
  const root = new THREE.Group();
  root.position.set(0, 1.4, -2.34);
  root.rotation.y = Math.PI / 4;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.6, 4.8));
  mesh.scale.y = 2.8 / 3.6;
  root.add(mesh);
  root.updateMatrixWorld(true);
  const world = (x, y, z) => mesh.localToWorld(new THREE.Vector3(x, y, z));
  const scratch = new THREE.Vector3();
  assert.equal(
    isCameraInsideMeshBounds(root, world(0.03, 0, 0), scratch),
    true,
  );
  assert.equal(
    isCameraInsideMeshBounds(root, world(0.2, 0, 0), scratch),
    false,
  );
  assert.equal(isCameraInsideMeshBounds(root, world(0, 2, 0), scratch), false);
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 4.8));
  ceiling.position.y = 2.86;
  assert.equal(
    isCameraInsideMeshBounds(ceiling, new THREE.Vector3(0, 2.83, 0), scratch),
    true,
  );
  assert.equal(
    isCameraInsideMeshBounds(ceiling, new THREE.Vector3(0, 2.7, 0), scratch),
    false,
  );
});
