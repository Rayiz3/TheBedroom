import * as THREE from 'three';

export function setMainCameraRendering(
  root: THREE.Object3D,
  rendered: boolean,
) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials) {
      const original = material.userData.roomMainPassState ?? {
        colorWrite: material.colorWrite,
        depthWrite: material.depthWrite,
      };
      material.userData.roomMainPassState = original;
      material.colorWrite = rendered ? original.colorWrite : false;
      material.depthWrite = rendered ? original.depthWrite : false;
    }
  });
}

// Architecture assets are box meshes. Test in mesh-local space so rotations,
// scale and group offsets cannot enlarge the test volume like a world AABB.
export function isCameraInsideMeshBounds(
  root: THREE.Object3D,
  cameraWorldPosition: THREE.Vector3,
  scratch: THREE.Vector3,
) {
  let inside = false;
  root.traverse((object) => {
    if (inside || !(object instanceof THREE.Mesh)) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    object.worldToLocal(scratch.copy(cameraWorldPosition));
    inside = object.geometry.boundingBox?.containsPoint(scratch) ?? false;
  });
  return inside;
}
