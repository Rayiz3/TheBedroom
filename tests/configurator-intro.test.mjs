import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadTypescript } from './helpers/load-typescript.mjs';
const { createIntroState, advanceIntro, INTRO_DURATION } = await loadTypescript(
  new URL('../components/room/intro-state.ts', import.meta.url),
);
function fixture() {
  const intro = createIntroState();
  const camera = new THREE.PerspectiveCamera();
  intro.top.set(0, 6, 0.001);
  intro.destination.set(3, 2, 4);
  camera.position.copy(intro.destination);
  camera.lookAt(intro.target);
  intro.destinationRotation.copy(camera.quaternion);
  camera.position.copy(intro.top);
  camera.lookAt(intro.target);
  intro.cameraReady = true;
  return { intro, camera };
}
void test('GPU loading time does not advance the camera transition clock', () => {
  const { intro, camera } = fixture();
  intro.phase = 'room';
  advanceIntro(intro, camera, 40, false, 40000);
  intro.roomReady = true;
  assert.equal(advanceIntro(intro, camera, 10, false, 50000), 'reveal');
  assert.ok(camera.position.equals(intro.top));
  assert.equal(intro.progress, 0);
  advanceIntro(intro, camera, 20, false, 70000);
  assert.equal(intro.progress, 0);
  advanceIntro(intro, camera, 0.01, false, 70000 + INTRO_DURATION * 500);
  assert.equal(intro.progress, 0.5);
  advanceIntro(intro, camera, 0.01, false, 70000 + INTRO_DURATION * 1000);
  assert.equal(intro.phase, 'ready');
  assert.ok(camera.position.equals(intro.destination));
});
void test('bed and room loading hold top view until all room assets are ready', () => {
  const { intro, camera } = fixture();
  assert.equal(advanceIntro(intro, camera, 30, false), null);
  intro.phase = 'room';
  assert.equal(advanceIntro(intro, camera, 30, false), null);
  assert.ok(camera.position.equals(intro.top));
  assert.equal(intro.progress, 0);
  intro.roomReady = true;
  assert.equal(advanceIntro(intro, camera, 0.01, false), 'reveal');
  assert.ok(camera.position.equals(intro.top));
});
void test('warm cache still presents the top view before revealing', () => {
  const { intro, camera } = fixture();
  intro.phase = 'room';
  intro.roomReady = true;
  assert.equal(advanceIntro(intro, camera, 0.5, false), null);
  assert.equal(advanceIntro(intro, camera, 0.4, false), 'reveal');
});
void test('camera returns to exact original transform and completion fires once', () => {
  const { intro, camera } = fixture();
  intro.phase = 'reveal';
  assert.equal(advanceIntro(intro, camera, INTRO_DURATION / 2, false), null);
  assert.equal(intro.phase, 'reveal');
  assert.equal(intro.progress, 0.5);
  assert.equal(advanceIntro(intro, camera, INTRO_DURATION / 2, false), 'ready');
  assert.ok(camera.position.equals(intro.destination));
  assert.ok(camera.quaternion.equals(intro.destinationRotation));
  assert.equal(intro.progress, 1);
  assert.equal(advanceIntro(intro, camera, 10, false), null);
});
void test('reduced motion skips travel but still waits for room readiness', () => {
  const { intro, camera } = fixture();
  intro.phase = 'room';
  assert.equal(advanceIntro(intro, camera, 0.1, true), null);
  intro.roomReady = true;
  assert.equal(advanceIntro(intro, camera, 0.1, true), 'reveal');
  assert.equal(advanceIntro(intro, camera, 0.1, true), 'ready');
  assert.ok(camera.position.equals(intro.destination));
});
void test('clockwise top orientation keeps the bed vertical and smoothly restores camera up', () => {
  const { intro, camera } = fixture();
  intro.top.set(0, 6, 0);
  intro.phase = 'reveal';
  advanceIntro(intro, camera, 0, false);
  camera.updateMatrixWorld();
  const head = new THREE.Vector3(-1, 0, 0).project(camera);
  const foot = new THREE.Vector3(1, 0, 0).project(camera);
  assert.ok(Math.abs(head.x - foot.x) < 1e-6);
  assert.ok(head.y > foot.y);
  advanceIntro(intro, camera, INTRO_DURATION / 2, false);
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  assert.ok(
    forward.dot(intro.target.clone().sub(camera.position).normalize()) >
      0.999999,
  );
  advanceIntro(intro, camera, INTRO_DURATION / 2, false);
  assert.ok(camera.up.equals(new THREE.Vector3(0, 1, 0)));
});
