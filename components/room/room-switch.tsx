'use client';
/* eslint-disable react/react-compiler -- GLB transforms and materials are prepared imperatively. */
import { useEffect, useMemo } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { SWITCH_MODEL_PATH } from './config';
import { useRoomModel } from './room-assets';

export function RoomSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  const gltf = useRoomModel(SWITCH_MODEL_PATH);
  const { gl } = useThree();
  const { model, position, materials } = useMemo(() => {
    const model = gltf.scene.clone(true);
    const materials: THREE.Material[] = [];
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const copies = (
        Array.isArray(object.material) ? object.material : [object.material]
      ).map((material) => material.clone());
      materials.push(...copies);
      object.material = Array.isArray(object.material) ? copies : copies[0];
      object.castShadow = true;
      object.receiveShadow = true;
    });
    const center = new THREE.Box3()
      .setFromObject(model, true)
      .getCenter(new THREE.Vector3());
    model.position.sub(center);
    // The asset is authored next to the door; convert into Wall_South local space.
    return {
      model,
      position: center.clone().sub(new THREE.Vector3(0, 1.4, 2.34)),
      materials,
    };
  }, [gltf.scene]);
  useEffect(
    () => () => {
      materials.forEach((material) => material.dispose());
      gl.domElement.style.cursor = '';
    },
    [materials, gl],
  );
  const visible = () => materials.some((material) => material.colorWrite);
  return (
    <group
      name="Room_Light_Switch"
      position={position}
      scale-x={enabled ? 1 : -1}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (!visible() || event.button !== 0 || event.delta > 4) return;
        event.stopPropagation();
        onToggle();
      }}
      onPointerOver={() => {
        if (visible()) gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = '';
      }}
    >
      <primitive object={model} />
    </group>
  );
}
