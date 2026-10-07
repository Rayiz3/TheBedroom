'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { colorFromKelvin } from './utils';
import {
  CEILING_AREA_LIGHT_SETTINGS,
  CEILING_AREA_LIGHT_POSITIONS,
} from './ceiling-area-settings';

export function CeilingAreaLights({
  intensity,
  temperature,
}: {
  intensity: number;
  temperature: number;
}) {
  return (
    <>
      {CEILING_AREA_LIGHT_POSITIONS.map((position, index) => (
        <RoomRectAreaLight
          key={index}
          name={`Early_${index}`}
          position={new THREE.Vector3(...position)}
          intensity={intensity}
          temperature={temperature}
          showSurface={false}
        />
      ))}
    </>
  );
}

// Physical illumination and the visible LED face share size, color and intensity.
export function RoomRectAreaLight({
  name,
  position,
  intensity,
  temperature,
  showLight = true,
  showSurface = true,
}: {
  name: string;
  position: THREE.Vector3;
  intensity: number;
  temperature: number;
  showLight?: boolean;
  showSurface?: boolean;
}) {
  const color = useMemo(() => {
    RectAreaLightUniformsLib.init();
    return colorFromKelvin(temperature);
  }, [temperature]);
  const settings = CEILING_AREA_LIGHT_SETTINGS;
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {showLight && (
        <rectAreaLight
          name={`Ceiling_Light_${name}`}
          width={settings.width}
          height={settings.height}
          intensity={intensity}
          color={color}
        />
      )}
      {showSurface && (
        <mesh name={`Ceiling_LED_${name}`} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[settings.width, settings.height]} />
          <meshStandardMaterial
            color="#eeeeea"
            roughness={0.8}
            metalness={0}
            emissive={color}
            emissiveIntensity={Math.max(0, intensity) * settings.emissiveScale}
          />
        </mesh>
      )}
    </group>
  );
}
