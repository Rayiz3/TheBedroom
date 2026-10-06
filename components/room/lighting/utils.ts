import * as THREE from 'three';
import { LAMP_POINT_SETTINGS } from './lamp-point-settings';

export function lampPointPosition(lamp: THREE.Object3D) {
  const stem = lamp.getObjectByName('Lamp_Right_Stem');
  const dome = lamp.getObjectByName('Lamp_Right_Dome');
  if (!(stem instanceof THREE.Mesh) || !(dome instanceof THREE.Mesh))
    throw new Error(
      'Lamp_Right_Stem and Lamp_Right_Dome required for lamp light',
    );
  lamp.updateWorldMatrix(true, true);
  stem.geometry.computeBoundingBox();
  const top = stem.geometry.boundingBox!.getCenter(new THREE.Vector3());
  top.y = stem.geometry.boundingBox!.max.y;
  stem.localToWorld(top);
  const domeBounds = new THREE.Box3().setFromObject(dome, true);
  top.y = Math.min(top.y, domeBounds.max.y - LAMP_POINT_SETTINGS.domeInset);
  top.x += LAMP_POINT_SETTINGS.stemOffsetX;
  return lamp.worldToLocal(top);
}

export function directionalPosition(
  distance: number,
  azimuthDegrees: number,
  elevationDegrees: number,
) {
  const elevation = THREE.MathUtils.degToRad(elevationDegrees);
  const azimuth = THREE.MathUtils.degToRad(azimuthDegrees);
  const horizontalDistance = distance * Math.cos(elevation);
  return new THREE.Vector3(
    horizontalDistance * Math.cos(azimuth),
    distance * Math.sin(elevation),
    horizontalDistance * Math.sin(azimuth),
  );
}

// Approximate blackbody chromaticity; convert display RGB to linear light color.
export function colorFromKelvin(kelvin: number) {
  const t = THREE.MathUtils.clamp(kelvin, 1800, 10000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b =
    t >= 66
      ? 255
      : t <= 19
        ? 0
        : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return new THREE.Color().setRGB(
    THREE.MathUtils.clamp(r / 255, 0, 1),
    THREE.MathUtils.clamp(g / 255, 0, 1),
    THREE.MathUtils.clamp(b / 255, 0, 1),
    THREE.SRGBColorSpace,
  );
}
