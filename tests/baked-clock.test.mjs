import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypescript } from './helpers/load-typescript.mjs';
const { BakedClock } = await loadTypescript(
  new URL('../components/room/physics/baked-clock.ts', import.meta.url),
);
test('first displayed sample ignores a long previous frame and reset starts a new timeline', () => {
  const clock = new BakedClock();
  assert.equal(clock.advance(10, 2, 10000), 0);
  assert.equal(clock.advance(10, 2, 10500), 0.5);
  clock.reset();
  assert.equal(clock.advance(10, 2, 20000), 0);
  assert.equal(clock.advance(0, 2, 22000), 2);
});
test('30, 60 and 144 FPS use the same actual duration regardless of supplied deltas', () => {
  for (const fps of [30, 60, 144]) {
    const clock = new BakedClock();
    clock.advance(5, 2, 1000);
    for (let frame = 1; frame < fps * 2; frame++) {
      const elapsed = clock.advance(5, 2, 1000 + (frame * 1000) / fps);
      assert.ok(Math.abs(elapsed - frame / fps) < 1e-9);
      assert.ok(elapsed < 2);
    }
    assert.equal(clock.advance(0, 2, 3000), 2);
  }
});
