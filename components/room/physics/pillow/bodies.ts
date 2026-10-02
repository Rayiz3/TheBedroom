import RAPIER from '@dimforge/rapier3d-compat';
import { PILLOW_IMPULSE_SETTINGS } from './settings';
export function createPillowBodies(world: RAPIER.World) {
  const bodies = [0, 1].map(() =>
    world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setCanSleep(false) // 미세 반동 중 자동 sleep 방지; 아래 정착 조건으로 처리
        .enabledTranslations(false, true, false)
        .enabledRotations(true, false, true)
        .setAdditionalMassProperties(
          PILLOW_IMPULSE_SETTINGS.mass,
          { x: 0, y: 0, z: 0 },
          {
            x: PILLOW_IMPULSE_SETTINGS.angularInertia,
            y: PILLOW_IMPULSE_SETTINGS.angularInertia,
            z: PILLOW_IMPULSE_SETTINGS.angularInertia,
          },
          { x: 0, y: 0, z: 0, w: 1 },
        )
        .setAngularDamping(PILLOW_IMPULSE_SETTINGS.angularDamping)
        .setLinearDamping(PILLOW_IMPULSE_SETTINGS.linearDamping),
    ),
  );
  bodies.forEach((body) => body.recomputeMassPropertiesFromColliders());

  return bodies;
}
