'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { useLoader, useThree } from '@react-three/fiber';
import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

import { ROOM_BACKGROUND_PATH, ROOM_HDRI_OPTIONS, type RoomHdri } from './config';

export function RoomEnvironment({
  source,
  intensity,
  onReady,
}: {
  source: RoomHdri;
  intensity: number;
  onReady: () => void;
}) {
  // Preload both maps so changing environments does not suspend the room.
  const environments = useLoader(
    EXRLoader,
    ROOM_HDRI_OPTIONS.map((option) => option.path),
  );
  const hdri =
    environments[ROOM_HDRI_OPTIONS.findIndex((option) => option.id === source)];
  const background = useLoader(THREE.TextureLoader, ROOM_BACKGROUND_PATH);
  const { scene } = useThree();

  useLayoutEffect(() => {
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    background.colorSpace = THREE.SRGBColorSpace;
    background.mapping = THREE.EquirectangularReflectionMapping;
    background.needsUpdate = true;
    const enabled = intensity > 0;
    scene.environment = enabled ? hdri : null;
    scene.background = background;
    scene.environmentIntensity = intensity;
    scene.backgroundIntensity = 1;
    scene.backgroundBlurriness = 0;

    return () => {
      scene.environment = null;
      scene.background = null;
    };
  }, [background, hdri, intensity, scene]);

  useLayoutEffect(() => onReady(), [background, hdri, onReady]);
  return null;
}
