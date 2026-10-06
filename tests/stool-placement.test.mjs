import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { placeStoolAndVase } = await loadTypescript(
  new URL('../components/room/stool-placement.ts', import.meta.url),
);
async function geometry(name) {
  const glb = fs.readFileSync(
    new URL(`../public/assets/${name}.glb`, import.meta.url),
  );
  const length = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + length).toString());
  json.buffers[0].uri = `data:application/octet-stream;base64,${glb.subarray(28 + length).toString('base64')}`;
  delete json.images;
  delete json.textures;
  json.materials = json.materials.map(() => ({}));
  globalThis.ProgressEvent ??= class ProgressEvent {
    constructor(type, data) {
      this.type = type;
      Object.assign(this, data);
    }
  };
  return (await new GLTFLoader().parseAsync(JSON.stringify(json), '')).scene;
}

void test('vase rests on actual stool and follows its parent transforms', async () => {
  const [stool, vase] = await Promise.all([
    geometry('stool'),
    geometry('vase'),
  ]);
  placeStoolAndVase(stool, vase, new THREE.Vector3(1, 0, -2));
  const stoolBounds = new THREE.Box3().setFromObject(stool, true);
  stool.add(vase);
  stool.updateMatrixWorld(true);
  const body = vase.getObjectByName('Vase_On_Stool');
  const bounds = body.geometry.boundingBox
    .clone()
    .applyMatrix4(body.matrixWorld);
  const center = bounds.getCenter(new THREE.Vector3());
  const stoolCenter = stoolBounds.getCenter(new THREE.Vector3());
  assert.ok(Math.abs(bounds.min.y - stoolBounds.max.y) < 1e-6);
  assert.ok(Math.abs(center.x - stoolCenter.x) < 1e-6);
  assert.ok(Math.abs(center.z - stoolCenter.z) < 1e-6);
  assert.ok(Math.abs(stoolBounds.min.y) < 1e-6);
  const local = vase.position.clone();
  stool.position.add(new THREE.Vector3(2, 1, -3));
  stool.rotation.y = Math.PI / 3;
  stool.scale.setScalar(1.4);
  stool.updateMatrixWorld(true);
  assert.ok(
    vase
      .getWorldPosition(new THREE.Vector3())
      .distanceTo(stool.localToWorld(local)) < 1e-6,
  );
  assert.equal(vase.parent, stool);
});
