// Explicit offline authoring tool. Never runs in the browser or build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadTypescript } from '../tests/helpers/load-typescript.mjs';
const load = (p) =>
  loadTypescript(new URL('../components/room/' + p, import.meta.url));
const { DuvetPhysics } = await load('physics/duvet/duvet-physics.ts');
const { BedSurface } = await load('physics/collision/bed-surface.ts');
const { createBedCollisionProxies } = await load('collision-proxies.ts');
const BED_FLOOR_Y = 0,
  BED_CENTER_Z = 0,
  WEST_WALL_INNER_X = -2.28;
const { PILLOW_CENTER_OFFSETS_Z, DUVET_ASSETS } = await import(
  'data:text/javascript;base64,' +
    Buffer.from(
      (await import('typescript')).default.transpileModule(
        fs
          .readFileSync(
            new URL('../components/room/config.ts', import.meta.url),
            'utf8',
          )
          .split('export const WINDOW_SUN_COLOR')[0],
        { compilerOptions: { module: 99 } },
      ).outputText,
    ).toString('base64')
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
  const nodes = json.nodes.map((n) => {
    const primitives =
      n.mesh === undefined ? [] : json.meshes[n.mesh].primitives;
    const meshes = primitives.map((p) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', accessor(p.attributes.POSITION));
      if (p.indices !== undefined) geometry.setIndex(accessor(p.indices));
      const mesh = new THREE.Mesh(geometry);
      mesh.name = THREE.PropertyBinding.sanitizeNodeName(n.name || '');
      mesh.userData.name = n.name;
      return mesh;
    });
    const node = meshes.length === 1 ? meshes[0] : new THREE.Group();
    if (meshes.length !== 1) node.add(...meshes);
    node.name = THREE.PropertyBinding.sanitizeNodeName(n.name || '');
    if (n.translation) node.position.fromArray(n.translation);
    if (n.rotation) node.quaternion.fromArray(n.rotation);
    if (n.scale) node.scale.fromArray(n.scale);
    if (n.matrix) {
      node.matrix.fromArray(n.matrix);
      node.matrix.decompose(node.position, node.quaternion, node.scale);
    }
    return node;
  });
  // Preserve inherited transforms, including the single bed frame's Z scale.
  json.nodes.forEach((n, i) => {
    for (const child of n.children || []) nodes[i].add(nodes[child]);
  });
  for (const id of json.scenes[json.scene || 0].nodes) root.add(nodes[id]);
  root.updateMatrixWorld(true);
  return root;
}

const readModel = model;
for (const bedSize of ['single', 'queen']) {
  const suffix = bedSize === 'single' ? 'sg' : 'qn';
  const model = readModel('bed_' + suffix),
    pad = readModel('pad_' + suffix);
  const pillows = [
    readModel(bedSize === 'single' ? 'pillow_std' : 'pillow_lg'),
    readModel(bedSize === 'single' ? 'pillow_std' : 'pillow_lg'),
  ];
  const pillowPoses = {
    current: [0, 1].map(() => ({
      base: new THREE.Vector3(),
      pivot: new THREE.Vector3(),
    })),
  };
  const pillowMaterials = [
    new THREE.MeshBasicMaterial(),
    new THREE.MeshBasicMaterial(),
  ];
  const duvetAsset = DUVET_ASSETS[bedSize];
  const duvetBinding = JSON.parse(
    fs.readFileSync(new URL('../public' + duvetAsset.binding, import.meta.url)),
  );
  const duvetGltf = { scene: readModel('duvet_' + suffix) };
  const duvet = duvetGltf.scene.getObjectByName(duvetAsset.renderMesh).clone();
  duvet.geometry = duvet.geometry.clone();
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const authoredBounds = new THREE.Box3().setFromObject(model);
  const authoredCenter = authoredBounds.getCenter(new THREE.Vector3());
  const bedOffset = new THREE.Vector3(
    WEST_WALL_INNER_X - authoredBounds.min.x,
    BED_FLOOR_Y - authoredBounds.min.y,
    BED_CENTER_Z - authoredCenter.z,
  );
  model.position.copy(bedOffset);
  model.updateMatrixWorld(true);

  const supportBounds = new THREE.Box3();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !/mattress/i.test(object.name))
      return;
    object.geometry.computeBoundingBox();
    if (object.geometry.boundingBox)
      supportBounds.union(
        object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld),
      );
  });
  if (supportBounds.isEmpty())
    throw new Error('Mattress required for pad placement');
  // Regression: single's inherited Z scale must not be dropped by the loader.
  // Current authored mattresses are approximately 1.12m / 1.52m wide.
  const mattressWidth = supportBounds.max.z - supportBounds.min.z;
  assert.ok(
    Math.abs(mattressWidth - (bedSize === 'single' ? 1.12 : 1.52)) < 0.02,
    `Unexpected ${bedSize} mattress width: ${mattressWidth}; check GLB hierarchy`,
  );
  pad.position.set(0, 0, 0);
  pad.updateMatrixWorld(true);
  const padBounds = new THREE.Box3().setFromObject(pad, true);
  const padCenter = padBounds.getCenter(new THREE.Vector3());
  const supportCenter = supportBounds.getCenter(new THREE.Vector3());
  pad.position.set(
    supportCenter.x - padCenter.x,
    supportBounds.max.y - padBounds.min.y - 0.01,
    supportCenter.z - padCenter.z,
  );
  pad.updateMatrixWorld(true);

  // Resolve the final placement first; all dependents use these world bounds.
  const placedPadBounds = new THREE.Box3().setFromObject(pad, true);
  const placedPadCenter = placedPadBounds.getCenter(new THREE.Vector3());
  const beddingOffset = new THREE.Vector3(
    placedPadCenter.x - supportCenter.x,
    placedPadBounds.max.y - supportBounds.max.y,
    placedPadCenter.z - supportCenter.z,
  );

  pillows.forEach((pillow, index) => {
    pillow.position.copy(bedOffset).add(beddingOffset);
    pillow.quaternion.identity();
    // Align actual geometry centers, not GLB origins (which can be off-center).
    pillow.updateMatrixWorld(true);
    const authoredPillowCenter = new THREE.Box3()
      .setFromObject(pillow, true)
      .getCenter(new THREE.Vector3());
    const targetZ =
      supportCenter.z +
      (index === 0 ? 1 : -1) * PILLOW_CENTER_OFFSETS_Z[bedSize];
    pillow.position.z += targetZ - authoredPillowCenter.z;
    pillow.name = `Pillow_${index + 1}`;
    pillowPoses.current[index].base.copy(pillow.position);
    pillow.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = pillowMaterials[index];
      object.castShadow = true;
      object.receiveShadow = true;
    });
    pillow.updateMatrixWorld(true);
    new THREE.Box3()
      .setFromObject(pillow)
      .getCenter(pillowPoses.current[index].pivot);
  });

  const collisionProxies = createBedCollisionProxies(
    model,
    pillows,
    bedSize,
    placedPadBounds,
  );

  const surface = new BedSurface([collisionProxies.root]);

  const mattressBounds = new THREE.Box3();
  model.traverse((object) => {
    if (object instanceof THREE.Mesh && /mattress/i.test(object.name)) {
      mattressBounds.union(new THREE.Box3().setFromObject(object));
    }
  });
  if (mattressBounds.isEmpty())
    throw new Error('Mattress mesh required for duvet placement');
  const mattressCenter = mattressBounds.getCenter(new THREE.Vector3());
  const minRenderY = Math.min(...duvetBinding.renderPositions.map((p) => p[1]));
  const dubetPosOffset = new THREE.Vector3(
    mattressCenter.x + beddingOffset.x + 0.16,
    placedPadBounds.max.y + 0.12 - minRenderY,
    mattressCenter.z + beddingOffset.z,
  );
  // Restore immutable GLB coordinates before rebuilding the rest mapping.
  duvet.geometry.copy(
    duvetGltf.scene.getObjectByName(duvetAsset.renderMesh).geometry,
  );
  if (duvet.geometry.attributes.uv && !duvet.geometry.attributes.uv1) {
    duvet.geometry.setAttribute('uv1', duvet.geometry.attributes.uv);
  }
  const sim = new DuvetPhysics(duvet, duvetBinding, surface, dubetPosOffset);

  const frames = [];
  const capture = () =>
    frames.push(
      ...sim.positions.flatMap((p) => [
        p.x - dubetPosOffset.x,
        p.y - dubetPosOffset.y,
        p.z - dubetPosOffset.z,
      ]),
    );
  capture();
  while (!sim.finished) {
    sim.step(1 / 60);
    capture();
  }
  const samples = new Float32Array(frames);
  if (!samples.every(Number.isFinite)) throw new Error('Non-finite recording');
  if (process.argv.includes('--check')) {
    const existing = fs.readFileSync(
      new URL(
        '../components/room/physics/duvet/baked/' + bedSize + '.ts',
        import.meta.url,
      ),
      'utf8',
    );
    const base64 = existing.match(/base64: "([^"]+)"/)[1];
    if (!Buffer.from(samples.buffer).equals(Buffer.from(base64, 'base64')))
      throw new Error('Bake drift: ' + bedSize);
    const clip = {
      fps: 60,
      vertices: sim.positions.length,
      frames: frames.length / (sim.positions.length * 3),
      positions: samples,
    };
    const replay = new DuvetPhysics(
      duvetGltf.scene.getObjectByName(duvetAsset.renderMesh).clone(),
      duvetBinding,
      surface,
      dubetPosOffset,
      clip,
    );
    replay.step(0.05);
    for (let i = 0; i < clip.vertices; i++)
      for (let axis = 0; axis < 3; axis++) {
        const expected =
          (samples[clip.vertices * 3 + i * 3 + axis] +
            samples[clip.vertices * 6 + i * 3 + axis]) /
          2;
        assert.ok(
          Math.abs(
            replay.positions[i].getComponent(axis) -
              (expected + dubetPosOffset.getComponent(axis)),
          ) < 1e-6,
        );
      }
    const shiftedOrigin = dubetPosOffset
      .clone()
      .add(new THREE.Vector3(2, 0, -3));
    const shiftedMesh = duvetGltf.scene
      .getObjectByName(duvetAsset.renderMesh)
      .clone();
    // Replay constructor must receive untouched authored geometry.
    shiftedMesh.geometry = readModel('duvet_' + suffix).getObjectByName(
      duvetAsset.renderMesh,
    ).geometry;
    const shifted = new DuvetPhysics(
      shiftedMesh,
      duvetBinding,
      surface,
      shiftedOrigin,
      clip,
    );
    shifted.step(0.05);
    shifted.positions.forEach((p, i) => {
      assert.ok(Math.abs(p.x - replay.positions[i].x - 2) < 1e-6);
      assert.ok(Math.abs(p.z - replay.positions[i].z + 3) < 1e-6);
    });
    const pose = replay.positions.map((p) => p.clone());
    replay.useLiveSimulation();
    assert.equal(replay.mode, 'live');
    replay.positions.forEach((p, i) => assert.ok(p.equals(pose[i])));
    replay.step(1 / 60);
    assert.ok(replay.positions.every((p) => Number.isFinite(p.x + p.y + p.z)));
    const beforeResetVersion = replay.mesh.geometry.attributes.position.version;
    replay.reset(true);
    assert.equal(
      replay.mesh.geometry.attributes.position.version,
      beforeResetVersion,
    );
    replay.step(1 / 60);
    assert.ok(
      replay.mesh.geometry.attributes.position.version > beforeResetVersion,
    );
    replay.reset();
    assert.equal(replay.mode, 'baked');
    for (let frame = 0; frame < 119; frame++) replay.step(1 / 60);
    assert.equal(replay.finished, false);
    assert.ok(Math.abs(replay.elapsed - 119 / 60) < 1e-9);
    replay.step(1 / 60);
    assert.equal(replay.elapsed, 2);
    assert.equal(replay.finished, true);
    replay.applyFootCenterImpulse();
    assert.equal(replay.mode, 'live');
    assert.equal(replay.finished, false);
    replay.step(1 / 60);
    console.log(
      'Verified live trajectory, interpolation, completion, reset and live handoff:',
      bedSize,
    );
    continue;
  }
  const out = new URL(
    '../components/room/physics/duvet/baked/',
    import.meta.url,
  );
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    new URL(bedSize + '.ts', out),
    '// Generated by tooling/bake-duvet.mjs from current assets and solver.\nexport default { fps: 60, vertices: ' +
      sim.positions.length +
      ', frames: ' +
      frames.length / (sim.positions.length * 3) +
      ', base64: ' +
      JSON.stringify(Buffer.from(samples.buffer).toString('base64')) +
      ' };\n',
  );
  console.log(
    bedSize,
    frames.length / (sim.positions.length * 3),
    'frames',
    samples.byteLength,
    'bytes',
  );
  collisionProxies.dispose();
}
