import { DEFAULT_FABRIC_MATERIAL_SETTINGS } from '@/lib/fabric-material';
import { calculateTextureRepeat } from '@/lib/texture-scale.mjs';

export type ViewerSettings = {
  exposure: number;
  envIntensity: number;
  roughness: number;
  clearcoat: number;
  normalScale: number;
  displacement: number;
  showEnvironment: boolean;
  autoRotate: boolean;
};

export type DuvetRepeatMode = 'physical' | 'legacy';

export const DEFAULT_SETTINGS: ViewerSettings = {
  exposure: 3,
  ...DEFAULT_FABRIC_MATERIAL_SETTINGS,
  showEnvironment: true,
  autoRotate: false,
};

export const MODEL_PATHS = [
  '/assets/bed.glb',
  '/assets/duvet.glb',
  '/assets/pillow_lg.glb',
] as const;

const FABRIC_PATCH_CM = { width: 9, length: 9 } as const;
const DUVET_CM = { width: 200, length: 230 } as const;
const DUVET_RENDER_LENGTH = 1.15;
export const DUVET_RENDER_WIDTH =
  DUVET_RENDER_LENGTH * (DUVET_CM.width / DUVET_CM.length);
export const DUVET_FACE_REPEAT = calculateTextureRepeat({
  productWidthCm: DUVET_CM.width,
  productLengthCm: DUVET_CM.length,
  patchWidthCm: FABRIC_PATCH_CM.width,
  patchLengthCm: FABRIC_PATCH_CM.length,
});
export const DUVET_PATCH_RENDER_SIZE =
  DUVET_RENDER_WIDTH / DUVET_FACE_REPEAT[0];
export const DUVET_CENTER_Z = 0.16;
export const PILLOW_CENTER_X = 0.2;
export const PILLOW_CENTER_Z = -0.5;
export const PILLOW_ROTATION_X = Math.PI / 4;
export const PILLOW_ROTATION_Y = Math.PI / 2;
export const PILLOW_RENDER_SCALE = [0.75, 0.67, 0.75] as const;
export const LEGACY_DUVET_TEXTURE_REPEAT = 20.5;
