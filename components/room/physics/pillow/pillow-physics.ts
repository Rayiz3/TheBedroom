import RAPIER from '@dimforge/rapier3d-compat';
import { PILLOW_IMPULSE_SETTINGS } from './settings';
import { createPillowBodies } from './bodies';
import { applyPillowRestoringForces, settlePillowBody } from './dynamics';
import { sampleTruncatedNormalXZ } from '../utils/random';
import { clampFrameDelta } from '../utils/time-step';

export function samplePillowImpulseOffset(random = Math.random) {
  return sampleTruncatedNormalXZ(
    PILLOW_IMPULSE_SETTINGS.impulsePointStdDev,
    PILLOW_IMPULSE_SETTINGS.impulsePointMaxRadius,
    random,
  );
}
/** Y-only dynamic bodies: the mattress support is represented by a restoring
 * spring around the resting pose, not a free six-axis rigid-body simulation. */
export class PillowPhysics {
  private world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  private accumulator = 0;
  readonly bodies: RAPIER.RigidBody[];

  constructor() {
    this.world.timestep = 1 / 120;
    this.bodies = createPillowBodies(this.world);
  }

  applyImpulse(index: number, offset = samplePillowImpulseOffset()) {
    const body = this.bodies[index];
    const center = body.worldCom();

    // Positions are in the physics world's coordinates, relative to the
    // pillow's resting pose. Existing translation/rotation locks are retained.
    body.applyImpulseAtPoint(
      { x: 0, y: PILLOW_IMPULSE_SETTINGS.impulseY, z: 0 },
      { x: center.x + offset.x, y: center.y, z: center.z + offset.z },
      true,
    );
  }

  step(delta: number) {
    this.accumulator += clampFrameDelta(delta);
    while (this.accumulator >= this.world.timestep) {
      this.accumulator -= this.world.timestep;
      this.bodies.forEach(applyPillowRestoringForces);
      this.world.step();
      this.bodies.forEach(settlePillowBody);
    }
  }

  displacement(index: number) {
    return this.bodies[index].translation().y;
  }
  rotation(index: number) {
    return this.bodies[index].rotation();
  }
  dispose() {
    this.world.free();
  }
}
