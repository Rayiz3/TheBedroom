import { RoomAmbientLight } from './ambient-light';
import { RoomDirectionalLight } from './directional-light';
import type { LightingSettings } from '../config';

export function BlenderLighting({
  ambientIntensity,
  ...directional
}: LightingSettings & { showGuide?: boolean }) {
  return (
    <>
      <RoomAmbientLight intensity={ambientIntensity} />
      <RoomDirectionalLight {...directional} />
    </>
  );
}
