'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated. */

import { useLoader, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';

import type { ViewerSettings } from './config';

export function TextureEnvironment({ settings }: { settings: ViewerSettings }) {
  const { scene, gl } = useThree();
  const environment = useLoader(
    THREE.TextureLoader,
    '/assets/environment/indoor-001-tonemapped.jpg',
  );

  useEffect(() => {
    environment.colorSpace = THREE.SRGBColorSpace;
    environment.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = environment;
    scene.background = settings.showEnvironment
      ? environment
      : new THREE.Color('#11140f');
    scene.backgroundBlurriness = 0;
    scene.environmentIntensity = settings.envIntensity;
    scene.backgroundIntensity = 1;
    scene.environmentRotation.y = 0;
    scene.backgroundRotation.y = 0;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = settings.exposure;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    return () => {
      scene.environment = null;
      scene.background = null;
    };
  }, [environment, gl, scene, settings]);
  return null;
}
