'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { useLoader, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

import { ROOM_HDRI_PATH } from './config';

export function RoomEnvironment({
  intensity,
  onReady,
}: {
  intensity: number;
  onReady: () => void;
}) {
  const hdri = useLoader(EXRLoader, ROOM_HDRI_PATH);
  const { scene } = useThree();
  const fallbackBackground = useMemo(() => new THREE.Color('#181817'), []);

  useLayoutEffect(() => {
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    const enabled = intensity > 0;
    scene.environment = enabled ? hdri : null;
    scene.background = enabled ? hdri : fallbackBackground;
    scene.environmentIntensity = 0.65 * intensity;
    scene.backgroundIntensity = intensity;
    scene.backgroundBlurriness = 0;

    return () => {
      scene.environment = null;
      scene.background = null;
    };
  }, [fallbackBackground, hdri, intensity, scene]);

  useLayoutEffect(() => onReady(), [hdri, onReady]);
  return null;
}
