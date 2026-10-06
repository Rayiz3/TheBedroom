import { Quaternion } from 'three';
import { BAKED_PILLOW_CLIPS, BAKED_PILLOW_FPS } from './baked-data';

/** Embedded clips: no network, Rapier initialization or per-trigger decoding. */
export class BakedPillowPlayback {
  private states = [0, 1].map(() => ({
    clip: -1,
    time: 0,
    lift: 0,
    rotation: new Quaternion(),
  }));
  private targetRotation = new Quaternion();

  constructor(private random: () => number = Math.random) {}

  play(index: number) {
    const state = this.states[index];
    state.clip = Math.min(
      BAKED_PILLOW_CLIPS.length - 1,
      Math.floor(this.random() * BAKED_PILLOW_CLIPS.length),
    );
    state.time = 0;
    state.lift = 0;
    state.rotation.identity();
  }

  step(delta: number) {
    for (const state of this.states) {
      if (state.clip < 0) continue;
      const frames = BAKED_PILLOW_CLIPS[state.clip].frames;
      const last = frames.length / 5 - 1;
      state.time = Math.min(
        last / BAKED_PILLOW_FPS,
        state.time + Math.max(0, delta),
      );
      const frame = Math.min(last, state.time * BAKED_PILLOW_FPS);
      const a = Math.floor(frame),
        b = Math.min(a + 1, last),
        t = frame - a;
      state.lift = frames[a * 5] + (frames[b * 5] - frames[a * 5]) * t;
      state.rotation.fromArray(frames, a * 5 + 1);
      this.targetRotation.fromArray(frames, b * 5 + 1);
      state.rotation.slerp(this.targetRotation, t);
      if (frame >= last) state.clip = -1;
    }
  }

  displacement(index: number) {
    return this.states[index].lift;
  }
  rotation(index: number) {
    return this.states[index].rotation;
  }
}
