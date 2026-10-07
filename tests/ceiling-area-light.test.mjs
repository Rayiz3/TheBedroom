import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { CEILING_AREA_LIGHT_POSITIONS, CEILING_AREA_LIGHT_SETTINGS } =
  await loadTypescript(
    new URL(
      '../components/room/lighting/ceiling-area-settings.ts',
      import.meta.url,
    ),
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
test('lights available before GLB loading match all three actual ceiling emitters', async () => {
  const [lamp, ceiling] = await Promise.all([
    geometry('lamp_ceiling'),
    geometry('ceiling'),
  ]);
  const lampBounds = new THREE.Box3().setFromObject(lamp, true);
  const ceilingBounds = new THREE.Box3()
    .setFromObject(ceiling, true)
    .translate(new THREE.Vector3(0, -0.8, 0));
  const lampCenter = lampBounds.getCenter(new THREE.Vector3());
  const ceilingCenter = ceilingBounds.getCenter(new THREE.Vector3());
  lamp.position.add(
    new THREE.Vector3(
      ceilingCenter.x - lampCenter.x,
      ceilingBounds.min.y - lampBounds.max.y,
      ceilingCenter.z - lampCenter.z,
    ),
  );
  lamp.updateMatrixWorld(true);
  const actual = [];
  lamp.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh) ||
      !/^Cube(?:[._]?\d+)?$/i.test(object.name)
    )
      return;
    const box = new THREE.Box3().setFromObject(object, true);
    const position = box.getCenter(new THREE.Vector3());
    position.y = box.min.y - CEILING_AREA_LIGHT_SETTINGS.surfaceGap;
    actual.push(position);
  });
  assert.equal(actual.length, 3);
  for (const position of CEILING_AREA_LIGHT_POSITIONS) {
    assert.ok(
      actual.some(
        (anchor) => anchor.distanceTo(new THREE.Vector3(...position)) < 1e-5,
      ),
      `Missing emitter at ${position}; actual ${JSON.stringify(actual)}`,
    );
  }
});
