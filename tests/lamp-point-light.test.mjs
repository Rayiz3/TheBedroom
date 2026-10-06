import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { lampPointPosition } = await loadTypescript(
  new URL('../components/room/lighting/utils.ts', import.meta.url),
);

test('actual lamp light anchor stays inside dome bounds and outside stem after placement', async () => {
  const glb = fs.readFileSync(
    new URL('../public/assets/lamp.glb', import.meta.url),
  );
  const jsonLength = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString());
  const binaryStart = 28 + jsonLength;
  // Geometry-only load: image decoding needs a browser, not this Node test.
  json.buffers[0].uri = `data:application/octet-stream;base64,${glb.subarray(binaryStart).toString('base64')}`;
  delete json.images;
  delete json.textures;
  json.materials = json.materials.map(() => ({}));
  globalThis.ProgressEvent ??= class ProgressEvent {
    constructor(type, data) {
      this.type = type;
      Object.assign(this, data);
    }
  };
  const { scene: lamp } = await new GLTFLoader().parseAsync(
    JSON.stringify(json),
    '',
  );
  const anchor = lampPointPosition(lamp);
  const carcass = new THREE.Group();
  carcass.position.set(0.5, 0.4, -1.2);
  lamp.position.set(2, -0.2, 0.5);
  carcass.attach(lamp);
  for (const z of [-1.2, -0.9]) {
    carcass.position.z = z;
    carcass.updateMatrixWorld(true);
    const point = lamp.localToWorld(anchor.clone());
    const dome = new THREE.Box3().setFromObject(
      lamp.getObjectByName('Lamp_Right_Dome'),
      true,
    );
    const stem = new THREE.Box3().setFromObject(
      lamp.getObjectByName('Lamp_Right_Stem'),
      true,
    );
    // setFromObject includes stem's children; use just the stem geometry instead.
    const stemMesh = lamp.getObjectByName('Lamp_Right_Stem');
    stem.copy(stemMesh.geometry.boundingBox).applyMatrix4(stemMesh.matrixWorld);
    assert.equal(dome.containsPoint(point), true);
    assert.equal(stem.containsPoint(point), false);
    assert.ok(point.y < dome.max.y);
  }
});
