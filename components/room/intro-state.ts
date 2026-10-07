import * as THREE from 'three';

export type IntroPhase = 'bed' | 'room' | 'reveal' | 'ready';
export const INTRO_DURATION = 2.8;
// HDRI multiplier during the second loading stage; 1 disables the boost.
export const INTRO_ROOM_HDRI_MULTIPLIER = 1.25;
export function createIntroState() {
  return {
    phase: 'bed' as IntroPhase,
    progress: 0,
    elapsed: 0,
    cameraReady: false,
    roomReady: false,
    perspective: null as THREE.PerspectiveCamera | null,
    topViewHeight: 1,
    target: new THREE.Vector3(),
    destination: new THREE.Vector3(),
    top: new THREE.Vector3(),
    destinationRotation: new THREE.Quaternion(),
    topRotation: new THREE.Quaternion(),
  };
}
export type IntroState = ReturnType<typeof createIntroState>;
export function introEase(t: number) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Returns only discrete phase changes; animation values stay outside React. */
export function advanceIntro(
  intro: IntroState,
  camera: THREE.Camera,
  delta: number,
  reducedMotion: boolean,
): IntroPhase | null {
  if (!intro.cameraReady || intro.phase === 'bed' || intro.phase === 'ready')
    return null;
  intro.elapsed += Math.max(0, delta);
  if (intro.phase === 'room') {
    // Let the logo cover clear and the top view register even on a warm cache.
    if (!intro.roomReady || (!reducedMotion && intro.elapsed < 0.9))
      return null;
    intro.phase = 'reveal';
    intro.elapsed = 0;
    return 'reveal';
  }
  const t = reducedMotion ? 1 : Math.min(intro.elapsed / INTRO_DURATION, 1);
  intro.progress = introEase(t);
  camera.position.lerpVectors(intro.top, intro.destination, intro.progress);
  camera.up.set(-(1 - intro.progress), intro.progress, 0).normalize();
  camera.lookAt(intro.target);
  if (t < 1) return null;
  camera.quaternion.copy(intro.destinationRotation);
  intro.phase = 'ready';
  return 'ready';
}
