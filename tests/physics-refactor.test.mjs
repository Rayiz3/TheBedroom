import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { DuvetPhysics } = await loadTypescript(
  new URL('../components/room/physics/duvet/duvet-physics.ts', import.meta.url),
);
const { BedSurface } = await loadTypescript(
  new URL(
    '../components/room/physics/collision/bed-surface.ts',
    import.meta.url,
  ),
);
const { PillowPhysics } = await loadTypescript(
  new URL(
    '../components/room/physics/pillow/pillow-physics.ts',
    import.meta.url,
  ),
);
const { initializePillowPhysics } = await loadTypescript(
  new URL('../components/room/physics/pillow/runtime.ts', import.meta.url),
);

function duvetTrace(Physics, Surface) {
  const positions = [
    [0, 0, 0],
    [0.5, 0, 0],
    [0, 0, 0.5],
    [0.5, 0, 0.5],
  ];
  const data = {
    renderPositions: positions,
    proxyPositions: positions,
    proxyTriangles: [
      [0, 1, 2],
      [1, 3, 2],
    ],
    stretchEdges: [
      [0, 1, 0.5],
      [0, 2, 0.5],
      [1, 3, 0.5],
      [2, 3, 0.5],
      [1, 2, Math.SQRT1_2],
    ],
    bendingHinges: [{ opposite: [0, 3] }],
    bindings: [
      [0, [1, 0, 0], [0, 0, 0]],
      [0, [0, 1, 0], [0, 0, 0]],
      [0, [0, 0, 1], [0, 0, 0]],
      [1, [0, 1, 0], [0, 0, 0]],
    ],
  };
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions.flat(), 3),
  );
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4));
  const sim = new Physics(
    new THREE.Mesh(geometry),
    data,
    new Surface([floor]),
    new THREE.Vector3(0, 0.5, 0),
  );
  const trace = [];
  for (let i = 0; i < 180; i++) {
    if (i === 90) sim.applyFootCenterImpulse();
    sim.step([1 / 120, 1 / 60, 0.08][i % 3]);
    trace.push(
      sim.elapsed,
      ...sim.positions.flatMap((p) => p.toArray()),
      ...geometry.attributes.position.array,
    );
  }
  sim.reset();
  trace.push(...geometry.attributes.position.array);
  return trace;
}
test('duvet refactor preserves full numerical trajectory and reset', () => {
  // Captured from the pre-refactor implementation with current tuned settings.
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify(duvetTrace(DuvetPhysics, BedSurface)))
      .digest('hex'),
    '935cf90eb707649722910a6cd95b814329a52135a1cb5d6a4c1d8674a5a212bf',
  );
});

test('pillow refactor preserves bounce, rotation and settling trajectory', async () => {
  await initializePillowPhysics();
  const b = new PillowPhysics();
  const trace = [];
  try {
    b.bodies[0].applyImpulseAtPoint(
      { x: 0, y: 0.35, z: 0 },
      { x: 0.06, y: 0, z: 0.03 },
      true,
    );
    for (let i = 0; i < 600; i++) {
      b.step(1 / 60);
      assert.equal(b.displacement(1), 0);
      const q = b.rotation(0);
      trace.push(b.displacement(0), q.x, q.y, q.z, q.w);
    }
    assert.equal(
      createHash('sha256').update(JSON.stringify(trace)).digest('hex'),
      '00b4d2600b6f8257ebe2aaac8753fabf64201652b8dd4898a6f2881c0b0a3099',
    );
  } finally {
    b.dispose();
  }
});
