import * as THREE from 'three';

// Measure detached model clones before React attaches the vase to the stool.
export function placeStoolAndVase(
  stool: THREE.Object3D,
  vase: THREE.Object3D,
  position: THREE.Vector3,
) {
  stool.position.set(0, 0, 0);
  vase.position.set(0, 0, 0);
  stool.updateMatrixWorld(true);
  vase.updateMatrixWorld(true);
  const stoolBounds = new THREE.Box3().setFromObject(stool, true);
  const stoolCenter = stoolBounds.getCenter(new THREE.Vector3());
  const body = vase.getObjectByName('Vase_On_Stool');
  if (!(body instanceof THREE.Mesh)) {
    throw new Error('Vase_On_Stool mesh missing from vase.glb');
  }
  body.geometry.computeBoundingBox();
  const vaseBounds = body.geometry
    .boundingBox!.clone()
    .applyMatrix4(body.matrixWorld);
  const vaseCenter = vaseBounds.getCenter(new THREE.Vector3());
  vase.position.set(
    stoolCenter.x - vaseCenter.x,
    stoolBounds.max.y - vaseBounds.min.y,
    stoolCenter.z - vaseCenter.z,
  );
  stool.position.set(
    position.x - stoolCenter.x,
    position.y - stoolBounds.min.y,
    position.z - stoolCenter.z,
  );
}
