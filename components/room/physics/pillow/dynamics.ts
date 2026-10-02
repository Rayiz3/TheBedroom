import type RAPIER from '@dimforge/rapier3d-compat';
import { PILLOW_IMPULSE_SETTINGS } from './settings';
export function applyPillowRestoringForces(body: RAPIER.RigidBody) {
  body.resetForces(false);
  body.resetTorques(false);
  const q = body.rotation();
  const sign = q.w < 0 ? -1 : 1;
  body.addTorque(
    {
      x: -2 * sign * q.x * PILLOW_IMPULSE_SETTINGS.angularStiffness,
      y: 0,
      z: -2 * sign * q.z * PILLOW_IMPULSE_SETTINGS.angularStiffness,
    },
    false,
  );
  body.addForce(
    {
      x: 0,
      y: -PILLOW_IMPULSE_SETTINGS.returnStiffness * body.translation().y,
      z: 0,
    },
    false,
  );
}
export function settlePillowBody(body: RAPIER.RigidBody) {
  const q = body.rotation();
  const angle = 2 * Math.acos(Math.min(1, Math.abs(q.w)));
  const limit = (PILLOW_IMPULSE_SETTINGS.maxTiltDegrees * Math.PI) / 180;
  if (angle > limit) {
    const length = Math.hypot(q.x, q.y, q.z);
    const factor = (Math.sin(limit / 2) / length) * (q.w < 0 ? -1 : 1);
    body.setRotation(
      {
        x: q.x * factor,
        y: q.y * factor,
        z: q.z * factor,
        w: Math.cos(limit / 2),
      },
      false,
    );
    body.setAngvel({ x: 0, y: 0, z: 0 }, false);
  }
  const y = body.translation().y;
  // Support plane prevents sinking; ceiling only limits repeated clicks.
  if (y < 0 || y > PILLOW_IMPULSE_SETTINGS.maxRise) {
    const impactSpeed = -body.linvel().y;
    const rebound =
      y < 0 && impactSpeed > PILLOW_IMPULSE_SETTINGS.bounceMinSpeed
        ? impactSpeed * PILLOW_IMPULSE_SETTINGS.restitution
        : 0;
    body.setTranslation(
      {
        x: 0,
        y: Math.max(0, Math.min(y, PILLOW_IMPULSE_SETTINGS.maxRise)),
        z: 0,
      },
      false,
    );
    // The resting support plane is handled here, not by a Rapier collider.
    body.setLinvel({ x: 0, y: rebound, z: 0 }, rebound > 0);
  }
  if (
    Math.abs(body.translation().y) < 0.0001 &&
    Math.abs(body.linvel().y) < 0.001 &&
    angle < 0.0001 &&
    Math.hypot(body.angvel().x, body.angvel().z) < 0.001
  ) {
    body.setTranslation({ x: 0, y: 0, z: 0 }, false);
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
    body.sleep();
  }
}
