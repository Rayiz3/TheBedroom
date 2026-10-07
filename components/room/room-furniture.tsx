'use client';
/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */
import { useMemo, useLayoutEffect, useState, useEffect, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useRoomModel } from './room-assets';
import { placeStoolAndVase } from './stool-placement';
import { RoomLampPointLight } from './lighting/point-light';
import { LAMP_POINT_SETTINGS } from './lighting/lamp-point-settings';
import { lampPointPosition } from './lighting/utils';
import {
  BED_MODEL_PATHS,
  CARCASS_MODEL_PATH,
  OBJECTS1_MODEL_PATH,
  LAMP_MODEL_PATH,
  STOOL_MODEL_PATH,
  VASE_MODEL_PATH,
  STOOL_POSITION,
  BED_FLOOR_Y,
  type BedSize,
} from './config';

export function RoomFurniture({ bedSize }: { bedSize: BedSize }) {
  const bed = useRoomModel(BED_MODEL_PATHS[bedSize]);
  const carcassGltf = useRoomModel(CARCASS_MODEL_PATH);
  const objects1Gltf = useRoomModel(OBJECTS1_MODEL_PATH);
  const lampGltf = useRoomModel(LAMP_MODEL_PATH);
  const carcasses = useMemo(
    () => [carcassGltf.scene.clone(true), carcassGltf.scene.clone(true)],
    [carcassGltf.scene],
  );
  const objects1 = useMemo(
    () => objects1Gltf.scene.clone(true),
    [objects1Gltf.scene],
  );
  const lamp = useMemo(() => lampGltf.scene.clone(true), [lampGltf.scene]);
  const pointPosition = useMemo(() => lampPointPosition(lamp), [lamp]);
  const [lampOn, setLampOn] = useState(LAMP_POINT_SETTINGS.defaultOn);
  const lampHovered = useRef(false);
  const lampBase = useRef(new THREE.Vector3());
  const lampAnchor = useRef(new THREE.Vector3());
  const reduceMotion = useRef(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduceMotion.current = query.matches; };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const { gl } = useThree();
  useEffect(
    () => () => {
      gl.domElement.style.cursor = '';
    },
    [gl],
  );
  useLayoutEffect(() => {
    const alignedBedBounds = new THREE.Box3().setFromObject(bed.scene);
    // Contents are JSX siblings, so carcass bounds never include them.
    carcasses.forEach((carcass) => {
      carcass.position.set(0, 0, 0);
      carcass.updateMatrixWorld(true);
    });
    const carcassBounds = new THREE.Box3().setFromObject(carcasses[0]);
    const carcassCenter = carcassBounds.getCenter(new THREE.Vector3());
    const carcassSize = carcassBounds.getSize(new THREE.Vector3());
    const sideCenterDistance =
      alignedBedBounds.getSize(new THREE.Vector3()).z * 0.5 +
      carcassSize.z * 0.5 +
      0.1;

    carcasses.forEach((carcass, index) => {
      const targetZ = index === 0 ? sideCenterDistance : -sideCenterDistance;
      carcass.position.set(
        0,
        BED_FLOOR_Y - carcassBounds.min.y,
        targetZ - carcassCenter.z,
      );
      carcass.name = index === 0 ? 'Carcass_Left' : 'Carcass_Right';
      carcass.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
      carcass.updateMatrixWorld(true);
    });

    objects1.position.set(0, 0, 0);
    objects1.updateMatrixWorld(true);

    lamp.position.set(0, 0, 0);
    lamp.scale.setScalar(1);
    lamp.updateMatrixWorld(true);

    const lampBounds = new THREE.Box3().setFromObject(lamp);
    const lampCenter = lampBounds.getCenter(new THREE.Vector3());
    const rightCarcassBounds = new THREE.Box3().setFromObject(carcasses[1]);
    const rightCarcassCenter = rightCarcassBounds.getCenter(
      new THREE.Vector3(),
    );
    lamp.position.set(
      rightCarcassCenter.x - lampCenter.x,
      rightCarcassBounds.max.y - lampBounds.min.y,
      rightCarcassCenter.z - lampCenter.z,
    );
    lampBase.current.copy(lamp.position);
    lampAnchor.current.set(lampCenter.x, lampBounds.min.y, lampCenter.z);
    lamp.name = 'Lamp_On_Right_Carcass';
    lamp.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    lamp.updateMatrixWorld(true);
    const objects1Bounds = new THREE.Box3().setFromObject(objects1);
    const objects1Center = objects1Bounds.getCenter(new THREE.Vector3());
    const leftCarcassBounds = new THREE.Box3().setFromObject(carcasses[0]);
    const leftCarcassCenter = leftCarcassBounds.getCenter(new THREE.Vector3());
    objects1.position.set(
      leftCarcassCenter.x - objects1Center.x,
      leftCarcassBounds.max.y - objects1Bounds.min.y,
      leftCarcassCenter.z - objects1Center.z,
    );
    objects1.name = 'Objects_On_Left_Carcass';
    objects1.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    objects1.updateMatrixWorld(true);

    // React owns all parent links, including during Fast Refresh.
  }, [bed.scene, carcasses, objects1, lamp]);
  useFrame((_, delta) => {
    const target = lampHovered.current ? 1.06 : 1;
    if (lamp.scale.x === target) return;
    const next = reduceMotion.current ? target : THREE.MathUtils.damp(lamp.scale.x, target, 14, delta);
    const scale = Math.abs(next - target) < 0.0001 ? target : next;
    lamp.scale.setScalar(scale);
    // Grow around the base so the lamp stays seated on the carcass.
    lamp.position.copy(lampBase.current).addScaledVector(lampAnchor.current, 1 - scale);
  });
  return (
    <group name="Room_Furniture">
      <primitive object={carcasses[0]} />
      <primitive object={carcasses[1]} />
      <primitive object={objects1} />
      <primitive
        object={lamp}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          if (event.button !== 0 || event.delta > 4) return;
          event.stopPropagation();
          setLampOn((on) => !on);
        }}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          lampHovered.current = true;
          gl.domElement.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          lampHovered.current = false;
          gl.domElement.style.cursor = '';
        }}
      >
        <RoomLampPointLight position={pointPosition} enabled={lampOn} />
      </primitive>
    </group>
  );
}
export function RoomStool() {
  const gltf = useRoomModel(STOOL_MODEL_PATH);
  const vaseGltf = useRoomModel(VASE_MODEL_PATH);
  const { stool, vase } = useMemo(() => {
    const stool = gltf.scene.clone(true);
    const vase = vaseGltf.scene.clone(true);
    placeStoolAndVase(stool, vase, STOOL_POSITION);
    stool.name = 'Stool';
    vase.name = 'Vase';
    for (const model of [stool, vase])
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
      });
    return { stool, vase };
  }, [gltf.scene, vaseGltf.scene]);
  return (
    <primitive object={stool}>
      <primitive object={vase} />
    </primitive>
  );
}
