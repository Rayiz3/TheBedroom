'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  DIRECTIONAL_LIGHT_BASE_AZIMUTH,
  DIRECTIONAL_LIGHT_DISTANCE,
  ROOM_ORIGIN,
  WINDOW_SUN_COLOR,
} from '../config';
import { directionalPosition } from './utils';

function LightDirectionGuide({
  color,
  position,
  target,
}: {
  color: THREE.ColorRepresentation;
  position: THREE.Vector3;
  target: THREE.Vector3;
}) {
  const directionLine = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      position,
      target,
    ]);
    const material = new THREE.LineBasicMaterial({
      color,
      depthTest: false,
      toneMapped: false,
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 10;
    line.frustumCulled = false;
    return line;
  }, [color, position, target]);

  useEffect(
    () => () => {
      directionLine.geometry.dispose();
      directionLine.material.dispose();
    },
    [directionLine],
  );

  return (
    <group name="Light_Debug_Guide">
      <mesh position={position} renderOrder={10}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
      </mesh>
      <primitive object={directionLine} />
    </group>
  );
}

export function RoomDirectionalLight({
  directionalIntensity,
  directionalDirection,
  directionalElevation,
  showGuide = true,
}: {
  directionalIntensity: number;
  directionalDirection: number;
  directionalElevation: number;
  showGuide?: boolean;
}) {
  const { scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const sunPosition = useMemo(
    () =>
      directionalPosition(
        DIRECTIONAL_LIGHT_DISTANCE,
        DIRECTIONAL_LIGHT_BASE_AZIMUTH + directionalDirection,
        directionalElevation,
      ),
    [directionalDirection, directionalElevation],
  );

  useEffect(() => {
    const sunLight = sun.current;
    if (sunLight) scene.add(sunLight.target);
    return () => {
      if (sunLight) scene.remove(sunLight.target);
    };
  }, [scene]);

  useLayoutEffect(() => {
    if (!sun.current) return;
    sun.current.position.copy(sunPosition);
    sun.current.target.position.copy(ROOM_ORIGIN);
    sun.current.target.updateMatrixWorld();
  }, [sunPosition]);

  return (
    <>
      <directionalLight
        ref={sun}
        name="Window_Sun"
        castShadow
        position={sunPosition}
        color={WINDOW_SUN_COLOR}
        intensity={directionalIntensity}
        shadow-intensity={0.75}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={5}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      {showGuide && (
        <LightDirectionGuide
          color="#ffd27a"
          position={sunPosition}
          target={ROOM_ORIGIN}
        />
      )}
    </>
  );
}
