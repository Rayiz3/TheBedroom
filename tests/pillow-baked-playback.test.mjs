import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTypescript } from './helpers/load-typescript.mjs';
const load = (name) =>
  loadTypescript(
    new URL(
      '../components/room/physics/pillow/' + name + '.ts',
      import.meta.url,
    ),
  );
const { BakedPillowPlayback } = await load('baked-playback');
const { BAKED_PILLOW_CLIPS: clips } = await load('baked-data');

test('approved clips play exact samples, interpolate, and finish at rest', () => {
  assert.deepEqual(
    clips.map((c) => c.id),
    [1, 2, 5, 6, 7],
  );
  clips.forEach((clip, index) => {
    const player = new BakedPillowPlayback(() => (index + 0.5) / 5);
    player.play(0);
    player.step(1 / 240);
    assert.ok(Math.abs(player.displacement(0) - clip.frames[5] / 2) < 1e-10);
    assert.ok(Math.abs(player.rotation(0).length() - 1) < 1e-6);
    player.step(1 / 240);
    for (let frame = 1; frame < clip.frames.length / 5; frame++) {
      assert.ok(
        Math.abs(player.displacement(0) - clip.frames[frame * 5]) < 1e-9,
      );
      player
        .rotation(0)
        .toArray()
        .forEach((v, k) =>
          assert.ok(Math.abs(v - clip.frames[frame * 5 + 1 + k]) < 1e-6),
        );
      assert.equal(player.displacement(1), 0);
      player.step(1 / 120);
    }
    player.step(20);
    assert.equal(player.displacement(0), 0);
    assert.deepEqual(player.rotation(0).toArray(), [0, 0, 0, 1]);
  });
});

test('retrigger picks another approved clip and leaves the other pillow running', () => {
  let choice = 0;
  const player = new BakedPillowPlayback(() => choice);
  player.play(0);
  player.step(0.1);
  const lift = player.displacement(0);
  choice = 0.99;
  player.play(1);
  assert.equal(player.displacement(0), lift);
  player.step(1 / 120);
  assert.equal(player.displacement(1), clips[4].frames[5]);
  player.play(0);
  assert.equal(player.displacement(0), 0);
  assert.equal(player.displacement(1), clips[4].frames[5]);
  player.step(1 / 120);
  assert.equal(player.displacement(0), clips[4].frames[5]);
});
test('wall clock playback starts at first sample and ignores unrelated frame deltas', () => {
  const a = new BakedPillowPlayback(() => 0);
  const b = new BakedPillowPlayback(() => 0);
  a.play(0);
  b.play(0);
  a.step(10, 1000);
  b.step(0, 1000);
  assert.equal(a.displacement(0), 0);
  a.step(10, 1250);
  b.step(0, 1250);
  assert.equal(a.displacement(0), b.displacement(0));
  assert.deepEqual(a.rotation(0).toArray(), b.rotation(0).toArray());
});
