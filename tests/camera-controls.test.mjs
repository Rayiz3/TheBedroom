import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { getCameraControls } = await loadTypescript(
  new URL('../components/room/camera-controls.ts', import.meta.url),
);

test('preparing another size preserves the live camera and reuses its orbit target', () => {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(5, 3, 6);
  camera.lookAt(1, 0, 2);
  const position = camera.position.clone();
  const rotation = camera.quaternion.clone();
  const queen = getCameraControls(camera);
  queen.object = camera;
  queen.target.set(1, 0, 2);
  const single = getCameraControls(camera);
  assert.equal(single, queen);
  single.update();
  assert.ok(camera.position.distanceTo(position) < 1e-10);
  assert.ok(camera.quaternion.angleTo(rotation) < 1e-7);
});

test('a control prepared during top view uses the same orbit direction as the normal view', () => {
  const top = new THREE.PerspectiveCamera();
  top.up.set(-1, 0, 0);
  const prepared = getCameraControls(top);
  top.up.set(0, 1, 0);
  top.position.set(5, 3, 6);
  prepared.object = top;
  prepared.update();
  const normal = top.clone();
  const reference = getCameraControls(normal);
  reference.object = normal;
  reference.update();
  assert.ok(Math.abs(prepared.getAzimuthalAngle() - reference.getAzimuthalAngle()) < 1e-10);
  assert.ok(Math.abs(prepared.getPolarAngle() - reference.getPolarAngle()) < 1e-10);
});
