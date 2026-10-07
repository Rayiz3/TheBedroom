import { RoomAmbientLight } from './ambient-light';
import { RoomDirectionalLight } from './directional-light';
import type { IntroState } from '../intro-state';
import type { LightingSettings } from '../config';

export function BlenderLighting({
  ambientIntensity,
  ...directional
}: LightingSettings & { showGuide?: boolean; intro?: IntroState }) {
  return (
    <>
      <RoomAmbientLight intensity={ambientIntensity} />
      <RoomDirectionalLight {...directional} />
    </>
  );
}
