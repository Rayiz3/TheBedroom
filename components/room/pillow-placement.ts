import * as THREE from 'three';

/** Align geometry to the placed bedding, independently of the GLB export origin. */
export function placePillow(
  pillow: THREE.Object3D,
  mattressBounds: THREE.Box3,
  padBounds: THREE.Box3,
  targetZ: number,
) {
  pillow.position.set(0, 0, 0);
  pillow.quaternion.identity();
  pillow.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(pillow, true);
  const center = bounds.getCenter(new THREE.Vector3());
  const headClearance = 0.02;
  pillow.position.set(
    mattressBounds.min.x + headClearance - bounds.min.x,
    padBounds.max.y - bounds.min.y,
    targetZ - center.z,
  );
  pillow.updateMatrixWorld(true);
}
