import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadTypescript } from './helpers/load-typescript.mjs';
const { placePillow } = await loadTypescript(
  new URL('../components/room/pillow-placement.ts', import.meta.url),
);
async function load(name) {
  const glb = fs.readFileSync(
    new URL(`../public/assets/${name}.glb`, import.meta.url),
  );
  const size = glb.readUInt32LE(12);
  const json = JSON.parse(glb.subarray(20, 20 + size));
  json.buffers[0].uri = `data:application/octet-stream;base64,${glb.subarray(28 + size).toString('base64')}`;
  delete json.images;
  delete json.textures;
  json.materials = (json.materials ?? []).map(() => ({}));
  globalThis.ProgressEvent ??= class {
    constructor(type, data) {
      this.type = type;
      Object.assign(this, data);
    }
  };
  return (await new GLTFLoader().parseAsync(JSON.stringify(json), '')).scene;
}
for (const [size, pillowName, offset] of [
  ['sg', 'std', 0.280071],
  ['qn', 'lg', 0.3545665],
]) {
  void test(`${size}: actual pillows rest on pad despite independent export origins`, async () => {
    const [bed, pad, source] = await Promise.all([
      load(`bed_${size}`),
      load(`pad_${size}`),
      load(`pillow_${pillowName}`),
    ]);
    const original = new THREE.Box3().setFromObject(bed, true);
    bed.position.set(
      -2.28 - original.min.x,
      -original.min.y,
      -(original.min.z + original.max.z) / 2,
    );
    bed.updateMatrixWorld(true);
    const mattress = new THREE.Box3();
    const head = new THREE.Box3();
    bed.traverse((o) => {
      if (o.isMesh && /head/i.test(o.name))
        head.union(new THREE.Box3().setFromObject(o, true));
      if (o.isMesh && /mattress/i.test(o.name))
        mattress.union(new THREE.Box3().setFromObject(o, true));
    });
    const supportCenter = mattress.getCenter(new THREE.Vector3());
    const padBounds = new THREE.Box3().setFromObject(pad, true);
    const padCenter = padBounds.getCenter(new THREE.Vector3());
    pad.position.set(
      supportCenter.x - padCenter.x,
      mattress.max.y - padBounds.min.y - 0.01,
      supportCenter.z - padCenter.z,
    );
    const placedPad = new THREE.Box3().setFromObject(pad, true);
    for (const side of [-1, 1]) {
      const pillow = source.clone(true);
      const targetZ = supportCenter.z + side * offset;
      placePillow(pillow, head, placedPad, targetZ);
      const bounds = new THREE.Box3().setFromObject(pillow, true);
      assert.ok(Math.abs(bounds.min.y - placedPad.max.y) < 1e-6);
      assert.equal(head.isEmpty(), false);
      assert.ok(Math.abs(bounds.min.x - head.max.x) < 1e-6);
      assert.ok(
        Math.abs(bounds.getCenter(new THREE.Vector3()).z - targetZ) < 1e-6,
      );
      assert.ok(bounds.max.x < mattress.max.x);
      assert.ok(
        bounds.min.z >= mattress.min.z - 0.001 &&
          bounds.max.z <= mattress.max.z + 0.001,
      );
      pillow.position.addScalar(12);
      pillow.rotation.y = 0.4;
      placePillow(pillow, head, placedPad, targetZ);
      assert.ok(
        new THREE.Box3()
          .setFromObject(pillow, true)
          .min.distanceTo(bounds.min) < 1e-6,
      );
    }
  });
}
