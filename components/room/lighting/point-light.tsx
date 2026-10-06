'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { colorFromKelvin } from './utils';
import { LAMP_POINT_SETTINGS } from './lamp-point-settings';

export function RoomLampPointLight({
  position,
  enabled,
}: {
  position: THREE.Vector3;
  enabled: boolean;
}) {
  const color = useMemo(
    () => colorFromKelvin(LAMP_POINT_SETTINGS.temperature),
    [],
  );
  return (
    <pointLight
      name="Right_Lamp_Point_Light"
      position={position}
      color={color}
      intensity={enabled ? LAMP_POINT_SETTINGS.intensity : 0}
      distance={LAMP_POINT_SETTINGS.distance}
      decay={2}
      castShadow
      shadow-radius={LAMP_POINT_SETTINGS.shadowRadius}
      shadow-mapSize-width={512}
      shadow-mapSize-height={512}
      shadow-camera-near={0.01}
      shadow-camera-far={LAMP_POINT_SETTINGS.distance}
      shadow-bias={-0.0001}
      shadow-normalBias={0.002}
    />
  );
}
