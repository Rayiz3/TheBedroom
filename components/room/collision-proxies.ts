import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { BedSize } from './config';

const COLLIDER_MESH_NAMES = {
  single: { mattress: 'Mattress_sg', body: 'Bed_Frame_Base_sg' },
  queen: { mattress: 'Mattress_qn', body: 'Bed_Frame_Base_qn' },
} as const;

// GLTFLoader removes reserved characters such as '.' from node names.
function matchesGltfName(mesh: THREE.Mesh, exportedName: string) {
  const originalName =
    typeof mesh.userData.name === 'string' ? mesh.userData.name : mesh.name;
  // Re-exported single assets may omit Blender's duplication suffix.
  const baseName = exportedName.replace(/\.\d+$/, '');
  return (
    originalName === baseName ||
    originalName === exportedName ||
    mesh.name === THREE.PropertyBinding.sanitizeNodeName(exportedName)
  );
}

export type BedCollisionProxies = {
  root: THREE.Group;
  dispose: () => void;
};

// 1 = 원래 tight bounds. 값을 낮추면 회전된 베개 collider의 로컬 Y 폭이 줄어듭니다.
export const PILLOW_COLLIDER_Y_SCALE = 0.9;

function geometryWorldBounds(mesh: THREE.Mesh) {
  mesh.geometry.computeBoundingBox();
  if (!mesh.geometry.boundingBox) return new THREE.Box3();
  // Box3.setFromObject(mesh) also walks mesh children. That can pull the
  // headboard into a frame collider when GLTF nodes are parented in a chain.
  return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
}

function worldBounds(
  root: THREE.Object3D,
  matches: (mesh: THREE.Mesh) => boolean,
) {
  const bounds = new THREE.Box3();
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && matches(object)) {
      bounds.union(geometryWorldBounds(object));
    }
  });
  return bounds;
}

function projectedWorldBounds(
  root: THREE.Object3D,
  orientation: THREE.Quaternion,
) {
  const bounds = new THREE.Box3();
  const inverseOrientation = orientation.clone().invert();
  const point = new THREE.Vector3();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const positions = object.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index += 1) {
      point
        .fromBufferAttribute(positions, index)
        .applyMatrix4(object.matrixWorld)
        .applyQuaternion(inverseOrientation);
      bounds.expandByPoint(point);
    }
  });
  return bounds;
}

function addWorldBox(root: THREE.Group, bounds: THREE.Box3, name: string) {
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z));
  mesh.name = name;
  mesh.position.copy(bounds.getCenter(new THREE.Vector3()));
  root.add(mesh);
}

function addRoundedWorldBox(
  root: THREE.Group,
  bounds: THREE.Box3,
  name: string,
  segments: number,
  radiusRatio: number,
) {
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.min(size.x, size.y, size.z) * radiusRatio;
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(size.x, size.y, size.z, segments, radius),
  );
  mesh.name = name;
  mesh.position.copy(bounds.getCenter(new THREE.Vector3()));
  root.add(mesh);
}

function addOrientedRoundedBox(
  root: THREE.Group,
  source: THREE.Object3D,
  name: string,
) {
  // GLB scene roots have no rotation; the actual pillow mesh carries it.
  let reference: THREE.Mesh | undefined;
  source.traverse((object) => {
    if (!reference && object instanceof THREE.Mesh) reference = object;
  });
  if (!reference) throw new Error('Pillow mesh required for collider');
  const orientation = reference.getWorldQuaternion(new THREE.Quaternion());
  const bounds = projectedWorldBounds(source, orientation);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  //size.y *= PILLOW_COLLIDER_Y_SCALE;
  const radius = Math.min(size.x, size.y, size.z) * 0.48;
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(size.x * 0.8, size.y * 0.8, size.z * 0.8, 1, radius),
  );
  mesh.name = name;
  mesh.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .applyQuaternion(orientation);
  mesh.quaternion.copy(orientation);
  root.add(mesh);
}

function mattressSupportingBodyBounds(model: THREE.Object3D, bodyName: string) {
  const parts: { name: string; bounds: THREE.Box3 }[] = [];
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    // Select only the upper body directly below the mattress. Never derive
    // collider bounds from the complete bed, the headboard, or name exclusion.
    if (!matchesGltfName(object, bodyName)) return;
    parts.push({
      name: object.name,
      bounds: geometryWorldBounds(object),
    });
  });

  if (parts.length !== 1) {
    throw new Error(
      `Expected the mattress-supporting upper bed body, found: ${
        parts.map(({ name }) => name).join(', ') || 'none'
      }`,
    );
  }
  return parts.map(({ bounds }) => bounds);
}

export function createBedCollisionProxies(
  model: THREE.Object3D,
  pillows: THREE.Object3D[],
  bedSize: BedSize,
  placedPadBounds?: THREE.Box3,
): BedCollisionProxies {
  model.updateMatrixWorld(true);
  pillows.forEach((pillow) => pillow.updateMatrixWorld(true));

  const root = new THREE.Group();
  root.name = 'Bed_Low_Poly_Colliders';
  const names = COLLIDER_MESH_NAMES[bedSize];
  const mattressBounds = worldBounds(model, (mesh) =>
    matchesGltfName(mesh, names.mattress),
  );
  if (mattressBounds.isEmpty())
    throw new Error(`Missing collider mesh: ${names.mattress}`);

  // A single collider encloses both the mattress and the finally placed pad.
  if (placedPadBounds) mattressBounds.union(placedPadBounds);
  addRoundedWorldBox(
    root,
    mattressBounds,
    'Mattress_LowPoly_Collider',
    2,
    0.18,
  );
  mattressSupportingBodyBounds(model, names.body).forEach((bounds, index) =>
    addWorldBox(root, bounds, `Bed_Frame_Box_${index + 1}_Collider`),
  );
  pillows.forEach((pillow, index) =>
    addOrientedRoundedBox(root, pillow, `Pillow_${index + 1}_LowPoly_Collider`),
  );
  root.updateMatrixWorld(true);

  return {
    root,
    dispose: () => {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      });
      root.clear();
    },
  };
}
