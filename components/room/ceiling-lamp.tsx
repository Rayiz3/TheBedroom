'use client';

/* eslint-disable react/react-compiler -- Three.js model transforms are resolved imperatively. */
import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CEILING_MODEL_PATH,
  CEILING_POSITION,
  CEILING_LAMP_MODEL_PATH,
} from './config';
import { useRoomModel } from './room-assets';
import { CEILING_AREA_LIGHT_SETTINGS } from './lighting/ceiling-area-settings';
import { RoomRectAreaLight } from './lighting/rect-area-light';
import {
  isCameraInsideMeshBounds,
  setMainCameraRendering,
} from './camera-visibility';

export function CeilingLamp({
  intensity,
  temperature,
}: {
  intensity: number;
  temperature: number;
}) {
  const gltf = useRoomModel(CEILING_LAMP_MODEL_PATH);
  const ceilingGltf = useRoomModel(CEILING_MODEL_PATH);
  const root = useRef<THREE.Group>(null);
  const renderedRef = useRef(true);
  const [enabled, setEnabled] = useState(true);
  const { camera, gl } = useThree();
  const cameraPoint = useMemo(() => new THREE.Vector3(), []);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const { model, emitters, ceilingBounds, materials } = useMemo(() => {
    const model = gltf.scene.clone(true);
    const materials: THREE.Material[] = [];
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const copies = (
        Array.isArray(object.material) ? object.material : [object.material]
      ).map((material) => material.clone());
      materials.push(...copies);
      object.material = Array.isArray(object.material) ? copies : copies[0];
    });
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model, true);
    const center = bounds.getCenter(new THREE.Vector3());
    const ceilingBounds = new THREE.Box3()
      .setFromObject(ceilingGltf.scene, true)
      .translate(CEILING_POSITION);
    const ceilingCenter = ceilingBounds.getCenter(new THREE.Vector3());
    model.position.add(
      new THREE.Vector3(
        ceilingCenter.x - center.x,
        ceilingBounds.min.y - bounds.max.y,
        ceilingCenter.z - center.z,
      ),
    );
    model.updateMatrixWorld(true);
    const emitters: { name: string; position: THREE.Vector3 }[] = [];
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      // GLTFLoader removes dots from Blender node names (Cube.002 -> Cube002).
      if (!/^Cube(?:[._]?\d+)?$/i.test(object.name)) return;
      const box = new THREE.Box3().setFromObject(object, true);
      const position = box.getCenter(new THREE.Vector3());
      position.y = box.min.y - CEILING_AREA_LIGHT_SETTINGS.surfaceGap;
      emitters.push({ name: object.name, position });
    });
    if (emitters.length !== 3)
      throw new Error('lamp_ceiling requires three Cube meshes');
    return { model, emitters, ceilingBounds, materials };
  }, [gltf.scene, ceilingGltf.scene]);
  useEffect(
    () => () => materials.forEach((material) => material.dispose()),
    [materials],
  );
  useEffect(
    () => () => {
      gl.domElement.style.cursor = '';
    },
    [gl],
  );
  useFrame(() => {
    if (!root.current) return;
    camera.getWorldPosition(cameraPoint);
    const rendered =
      cameraPoint.y <= ceilingBounds.getCenter(scratch).y &&
      !ceilingBounds.containsPoint(cameraPoint) &&
      !isCameraInsideMeshBounds(model, cameraPoint, scratch);
    renderedRef.current = rendered;
    setMainCameraRendering(root.current, rendered);
  });
  return (
    <group
      ref={root}
      name="Ceiling_Lamp"
      onClick={(event: ThreeEvent<MouseEvent>) => {
        if (!renderedRef.current || event.button !== 0 || event.delta > 4)
          return;
        event.stopPropagation();
        setEnabled((on) => !on);
      }}
      onPointerOver={() => {
        if (renderedRef.current) gl.domElement.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = '';
      }}
    >
      <primitive object={model} />
      {emitters.map((emitter) => (
        <RoomRectAreaLight
          key={emitter.name}
          name={emitter.name}
          position={emitter.position}
          intensity={enabled ? intensity : 0}
          temperature={temperature}
        />
      ))}
    </group>
  );
}
