'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { useFrame, useThree } from '@react-three/fiber';
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useRoomModel } from './room-assets';
import {
  isCameraInsideMeshBounds,
  setMainCameraRendering,
} from './camera-visibility';

import {
  CEILING_CENTER,
  CEILING_INWARD_NORMAL,
  CEILING_MODEL_PATH,
  CEILING_POSITION,
  FLOOR_MODEL_PATH,
  WALL_MODEL_PATH,
  WALL_DOOR_MODEL_PATH,
  WALL_DOOR_SOURCE_OFFSET,
  WALL_PLACEMENTS,
  WALL_SOURCE_OFFSET,
  WINDOW_INWARD_NORMAL,
  WINDOW_MODEL_PATH,
  WINDOW_POSITION,
  WINDOW_SOURCE_OFFSET,
} from './config';
function cloneRoomModel(source: THREE.Group) {
  const model = source.clone(true);

  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = (
      Array.isArray(object.material) ? object.material : [object.material]
    ).map((material) => material.clone());
    object.material = Array.isArray(object.material) ? materials : materials[0];
  });

  return model;
}

function RoomArchitecture() {
  const floorGltf = useRoomModel(FLOOR_MODEL_PATH);
  const wallGltf = useRoomModel(WALL_MODEL_PATH);
  const doorWallGltf = useRoomModel(WALL_DOOR_MODEL_PATH);
  const ceilingGltf = useRoomModel(CEILING_MODEL_PATH);
  const windowGltf = useRoomModel(WINDOW_MODEL_PATH);
  const { camera } = useThree();
  const floor = useMemo(
    () => cloneRoomModel(floorGltf.scene),
    [floorGltf.scene],
  );
  const walls = useMemo(
    () =>
      WALL_PLACEMENTS.map((placement) =>
        cloneRoomModel(
          placement.name === 'Wall_South' ? doorWallGltf.scene : wallGltf.scene,
        ),
      ),
    [wallGltf.scene, doorWallGltf.scene],
  );
  const ceiling = useMemo(
    () => cloneRoomModel(ceilingGltf.scene),
    [ceilingGltf.scene],
  );
  const window = useMemo(
    () => cloneRoomModel(windowGltf.scene),
    [windowGltf.scene],
  );
  const wallGroups = useRef<Array<THREE.Group | null>>([]);
  const ceilingGroup = useRef<THREE.Group>(null);
  const windowGroup = useRef<THREE.Group>(null);
  const cameraOffset = useMemo(() => new THREE.Vector3(), []);
  const cameraWorldPosition = useMemo(() => new THREE.Vector3(), []);
  const localCameraPosition = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    [floor, ...walls].forEach((roomObject) => {
      roomObject.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
    });
    [ceiling, window].forEach((roomObject) => {
      roomObject.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
    });
  }, [ceiling, floor, walls, window]);

  useFrame(() => {
    camera.getWorldPosition(cameraWorldPosition);
    WALL_PLACEMENTS.forEach((placement, index) => {
      const wallGroup = wallGroups.current[index];
      if (!wallGroup) return;
      cameraOffset.copy(cameraWorldPosition).sub(placement.position);
      setMainCameraRendering(
        wallGroup,
        cameraOffset.dot(placement.inwardNormal) >= 0 &&
          !isCameraInsideMeshBounds(
            wallGroup,
            cameraWorldPosition,
            localCameraPosition,
          ),
      );
    });
    if (ceilingGroup.current) {
      cameraOffset.copy(cameraWorldPosition).sub(CEILING_CENTER);
      setMainCameraRendering(
        ceilingGroup.current,
        cameraOffset.dot(CEILING_INWARD_NORMAL) >= 0 &&
          !isCameraInsideMeshBounds(
            ceilingGroup.current,
            cameraWorldPosition,
            localCameraPosition,
          ),
      );
    }
    if (windowGroup.current) {
      cameraOffset.copy(cameraWorldPosition).sub(WINDOW_POSITION);
      setMainCameraRendering(
        windowGroup.current,
        cameraOffset.dot(WINDOW_INWARD_NORMAL) >= 0,
      );
    }
  });

  return (
    <group name="Room_Architecture">
      <primitive object={floor} />
      <group ref={ceilingGroup} name="Ceiling">
        <primitive object={ceiling} position={CEILING_POSITION} />
      </group>
      <group ref={windowGroup} name="Window" position={WINDOW_POSITION}>
        <primitive object={window} position={WINDOW_SOURCE_OFFSET} />
      </group>
      {WALL_PLACEMENTS.map((placement, index) => (
        <group
          key={placement.name}
          ref={(group) => {
            wallGroups.current[index] = group;
          }}
          name={placement.name}
          position={placement.position}
          rotation-y={placement.rotationY}
        >
          <primitive
            object={walls[index]}
            position={
              placement.name === 'Wall_South'
                ? WALL_DOOR_SOURCE_OFFSET
                : WALL_SOURCE_OFFSET
            }
          />
        </group>
      ))}
    </group>
  );
}

export const StaticRoomArchitecture = memo(function StaticRoomArchitecture() {
  return <RoomArchitecture />;
});
