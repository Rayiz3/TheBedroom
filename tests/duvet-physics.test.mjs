import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadTypescript } from './helpers/load-typescript.mjs';
import * as THREE from 'three';

const { DuvetPhysics } = await loadTypescript(
  new URL('../components/room/physics/duvet/duvet-physics.ts', import.meta.url),
);
const { BedSurface } = await loadTypescript(
  new URL(
    '../components/room/physics/collision/bed-surface.ts',
    import.meta.url,
  ),
);
function model(name) {
  const bytes = fs.readFileSync(
    new URL(`../public/assets/${name}.glb`, import.meta.url),
  );
  const length = bytes.readUInt32LE(12),
    json = JSON.parse(bytes.toString('utf8', 20, 20 + length));
  const start = 28 + length;
  function accessor(id) {
    const a = json.accessors[id],
      v = json.bufferViews[a.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[
      a.componentType
    ];
    const off = start + (v.byteOffset || 0) + (a.byteOffset || 0);
    const data = new C(
      bytes.buffer.slice(
        bytes.byteOffset + off,
        bytes.byteOffset + off + a.count * size * C.BYTES_PER_ELEMENT,
      ),
    );
    return new THREE.BufferAttribute(data, size);
  }
  const root = new THREE.Group();
  for (const n of json.nodes) {
    if (n.mesh === undefined) continue;
    for (const p of json.meshes[n.mesh].primitives) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', accessor(p.attributes.POSITION));
      if (p.indices !== undefined) g.setIndex(accessor(p.indices));
      const mesh = new THREE.Mesh(g);
      mesh.name = n.name;
      if (n.translation) mesh.position.fromArray(n.translation);
      if (n.rotation) mesh.quaternion.fromArray(n.rotation);
      if (n.scale) mesh.scale.fromArray(n.scale);
      if (n.matrix) {
        mesh.matrix.fromArray(n.matrix);
        mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
      }
      root.add(mesh);
    }
  }
  root.updateMatrixWorld(true);
  return root;
}
void test('bed contact includes mattress and body but excludes headboard', () => {
  const bed = model('bed_qn'),
    pillow = model('pillow_lg');
  const surface = new BedSurface([bed, pillow]);
  const mattress = bed.children.find((object) =>
      /^Mattress/i.test(object.name),
    ),
    head = bed.children.find((object) =>
      /^Bed_Headboard_Upright/i.test(object.name),
    );
  const mb = new THREE.Box3().setFromObject(mattress),
    hb = new THREE.Box3().setFromObject(head);
  const m = mb.getCenter(new THREE.Vector3()),
    h = hb.getCenter(new THREE.Vector3());
  assert.ok(surface.height(m.x, m.z) < hb.max.y - 0.15);
  assert.ok(surface.height(h.x, h.z) < hb.max.y - 0.15);
  assert.ok(surface.solids.some((s) => /mattress/i.test(s.name)));
  assert.ok(surface.solids.some((s) => /frame/i.test(s.name)));
  assert.ok(surface.solids.every((s) => !/head/i.test(s.name)));
});
void test('side contacts slide instead of teleporting onto the top surface', () => {
  const box = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2));
  box.name = 'Mattress';
  box.position.y = 1;
  const surface = new BedSurface([box]);
  const p = new THREE.Vector3(0.995, 1, 0);
  const old = p.clone().add(new THREE.Vector3(0, 0.01, 0));
  surface.project(p, old, 0.02);
  assert.ok(p.x >= 1.019);
  assert.equal(p.y, 1);
  assert.ok(old.y > p.y, 'downward sliding velocity survives contact');
});
void test('empty space inside mesh bounds is not treated as solid', () => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16));
  mesh.name = 'Mattress';
  mesh.position.y = 1;
  const surface = new BedSurface([mesh]);
  const p = new THREE.Vector3(0.9, 1, 0.9);
  const before = p.clone();
  surface.project(p, p.clone(), 0.02);
  assert.ok(p.distanceTo(before) < 1e-9);
});
void test('actual exported vertices bind, drop and settle without NaNs or proxy penetration', () => {
  const bed = model('bed_qn'),
    pillows = [model('pillow_lg'), model('pillow_lg')];
  pillows[1].position.z -= 0.709133;
  const surface = new BedSurface([bed, ...pillows]);
  const mb = new THREE.Box3().setFromObject(
      bed.children.find((object) => /^Mattress/i.test(object.name)),
    ),
    center = mb.getCenter(new THREE.Vector3());
  const data = JSON.parse(
    fs.readFileSync(
      new URL('../public/assets/duvet_sim_binding.json', import.meta.url),
    ),
  );
  const minY = Math.min(...data.renderPositions.map((p) => p[1]));
  const offset = new THREE.Vector3(
    center.x + 0.18,
    mb.max.y + 0.3 - minY,
    center.z,
  );
  data.proxyPositions.forEach(
    (p) =>
      (offset.y = Math.max(
        offset.y,
        surface.height(p[0] + offset.x, p[2] + offset.z) + 0.3 - minY,
      )),
  );
  const mesh = model('duvet_qn').getObjectByName('duvet_render');
  const sim = new DuvetPhysics(mesh, data, surface, offset);
  const initial =
    sim.positions.reduce((s, p) => s + p.y, 0) / sim.positions.length;
  for (let frame = 0; frame < 610; frame++) sim.step(1 / 60);
  assert.equal(sim.mapping.length, mesh.geometry.attributes.position.count);
  assert.ok(sim.positions.every((p) => Number.isFinite(p.x + p.y + p.z)));
  const normal = new THREE.Vector3();
  assert.ok(
    sim.positions.every((p, i) =>
      surface.solids.every(
        (s) => surface.distance(p, s, normal) >= sim.contactRadii[i] - 0.002,
      ),
    ),
  );
  const final =
    sim.positions.reduce((s, p) => s + p.y, 0) / sim.positions.length;
  assert.ok(initial - final > 0.15);
  const maxStretch = Math.max(
    ...sim.constraints
      .filter((c) => c.compliance < 1e-5)
      .map((c) => sim.positions[c.a].distanceTo(sim.positions[c.b]) / c.length),
  );
  assert.ok(maxStretch < 1.15, `stretch ${maxStretch}`);
});

void test('duvet reuses scratch buffers and skips mesh work without a physical step', () => {
  const data = JSON.parse(
    fs.readFileSync(
      new URL('../public/assets/duvet_sim_binding.json', import.meta.url),
    ),
  );
  const floor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 6));
  const sim = new DuvetPhysics(
    model('duvet_qn').getObjectByName('duvet_render'),
    data,
    new BedSurface([floor]),
    new THREE.Vector3(0, 2, 0),
  );
  const buffers = [
    sim.heights,
    sim.renderer.normals,
    sim.renderer.frames,
    sim.renderer.canonical,
    ...sim.renderer.normals,
    ...sim.renderer.frames.map((f) => f.t),
  ];
  const initial = sim.mesh.geometry.attributes.position.array.slice();
  const position = sim.mesh.geometry.attributes.position;
  const normal = sim.mesh.geometry.attributes.normal;
  let version = position.version;
  let normalVersion = normal.version;
  sim.step(1 / 120);
  assert.equal(position.version, version);
  assert.equal(normal.version, normalVersion);
  assert.equal(sim.timings.meshMs, 0);
  assert.equal(sim.timings.normalsMs, 0);
  sim.step(1 / 120);
  assert.ok(position.version > version);
  assert.ok(normal.version > normalVersion);
  for (let i = 0; i < 8; i++) sim.step(1 / 60);
  const after = [
    sim.heights,
    sim.renderer.normals,
    sim.renderer.frames,
    sim.renderer.canonical,
    ...sim.renderer.normals,
    ...sim.renderer.frames.map((f) => f.t),
  ];
  after.forEach((value, i) => assert.equal(value, buffers[i]));
  assert.notDeepEqual(position.array, initial);
  sim.reset();
  assert.deepEqual(position.array, initial);
  version = position.version;
  normalVersion = normal.version;
  sim.elapsed = 1e6;
  sim.step(1 / 60);
  assert.equal(position.version, version);
  assert.equal(normal.version, normalVersion);
  assert.deepEqual(sim.timings, { solverMs: 0, meshMs: 0, normalsMs: 0 });
});
