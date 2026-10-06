import * as THREE from 'three';

export const BED_MODEL_PATHS = {
  single: '/assets/bed_sg.glb',
  queen: '/assets/bed_qn.glb',
} as const;

export const PILLOW_MODEL_PATHS = {
  single: '/assets/pillow_std.glb',
  queen: '/assets/pillow_lg.glb',
} as const;

export type BedSize = keyof typeof BED_MODEL_PATHS;
export const PAD_MODEL_PATHS = {
  single: '/assets/pad_sg.glb',
  queen: '/assets/pad_qn.glb',
} as const;

export const DUVET_ASSETS = {
  single: {
    model: '/assets/duvet_sg.glb',
    binding: '/assets/duvet_sim2_binding.json',
    renderMesh: 'duvet_render2',
  },
  queen: {
    model: '/assets/duvet_qn.glb',
    binding: '/assets/duvet_sim_binding.json',
    renderMesh: 'duvet_render',
  },
} as const;

// 매트리스 Z 중심에서 각 베개 중심까지의 거리(m).
// 기존 두 베개 사이 거리의 절반으로, 간격은 유지하고 중앙 정렬합니다.
export const PILLOW_CENTER_OFFSETS_Z = {
  single: 0.280071,
  queen: 0.3545665,
} as const;

export const FABRIC_DATA_TEXTURE_PATHS = [
  '/textures/Spatially_bio_v3_2K/Spatially_bio_v3ao_2K_Roughness.png',
  '/textures/Spatially_bio_v3_2K/Spatially_bio_v3ao_2K_NormalGL.png',
  '/textures/Spatially_bio_v3_2K/Spatially_bio_v3ao_2K_Displacement.png',
  '/textures/Spatially_bio_v3_2K/Spatially_bio_v3ao_2K_AmbientOcclusion.png',
] as const;

export const PILLOW_PALETTE = [
  { id: 'lilac', label: 'Lilac', path: '/palette/lilac.png' },
  { id: 'ivory', label: 'Ivory', path: '/palette/ivory.png' },
  { id: 'rose', label: 'Rose', path: '/palette/rose.png' },
  { id: 'sage', label: 'Sage', path: '/palette/sage.png' },
  { id: 'blue', label: 'Blue', path: '/palette/blue.png' },
  { id: 'taupe', label: 'Taupe', path: '/palette/taupe.png' },
] as const;

export type BeddingPalette = {
  pad: Palette;
  pillow1: Palette;
  pillow2: Palette;
  duvet: Palette;
};

export type Palette = (typeof PILLOW_PALETTE)[number]['id'];

export const DEFAULT_PILLOW_PALETTE: Palette = 'lilac';
export const PILLOW_FABRIC_PATCH_SIZE = 0.09;
export const CARCASS_MODEL_PATH = '/assets/carcass.glb';
export const OBJECTS1_MODEL_PATH = '/assets/objects1.glb';
export const LAMP_MODEL_PATH = '/assets/lamp.glb';
export const CEILING_LAMP_MODEL_PATH = '/assets/lamp_ceiling.glb';
export const STOOL_MODEL_PATH = '/assets/stool.glb';
export const FLOOR_MODEL_PATH = '/assets/floor.glb';
export const WALL_MODEL_PATH = '/assets/wall.glb';
export const WALL_DOOR_MODEL_PATH = '/assets/wall_door.glb';
export const WINDOW_MODEL_PATH = '/assets/window.glb';
export const CEILING_MODEL_PATH = '/assets/ceiling.glb';
export const ROOM_BACKGROUND_PATH =
  '/DaySkyHDRI070B_2K/DaySkyHDRI070B_2K_TONEMAPPED.jpg';
export const ROOM_HDRI_OPTIONS = [
  {
    id: 'daysky',
    label: 'DaySky',
    path: '/DaySkyHDRI070B_2K/DaySkyHDRI070B_2K_HDR.exr',
  },
  {
    id: 'indoor',
    label: 'IndoorEnvironment',
    path: '/IndoorEnvironmentHDRI001_4K/IndoorEnvironmentHDRI001_4K_HDR.exr',
  },
] as const;
export type RoomHdri = (typeof ROOM_HDRI_OPTIONS)[number]['id'];

export const ROOM_MODEL_PATHS = [
  ...Object.values(PAD_MODEL_PATHS),
  ...Object.values(BED_MODEL_PATHS),
  ...Object.values(DUVET_ASSETS).map((asset) => asset.model),
  ...Object.values(PILLOW_MODEL_PATHS),
  CARCASS_MODEL_PATH,
  OBJECTS1_MODEL_PATH,
  LAMP_MODEL_PATH,
  CEILING_LAMP_MODEL_PATH,
  STOOL_MODEL_PATH,
  FLOOR_MODEL_PATH,
  WALL_MODEL_PATH,
  WALL_DOOR_MODEL_PATH,
  WINDOW_MODEL_PATH,
  CEILING_MODEL_PATH,
] as const;

export const ROOM_TEXTURE_PATHS = [
  ...FABRIC_DATA_TEXTURE_PATHS,
  ...PILLOW_PALETTE.map(({ path }) => path),
] as const;

export const WINDOW_SUN_COLOR = new THREE.Color().setRGB(1, 0.92, 0.79);
export const ROOM_ORIGIN = new THREE.Vector3(0, 0, 0);
export const DIRECTIONAL_LIGHT_DISTANCE = 6.4;
export const DIRECTIONAL_LIGHT_BASE_AZIMUTH = 36.87;

export { default as DEFAULT_LIGHTING } from './environment-defaults.json';

export type LightingSettings = {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalDirection: number;
  directionalElevation: number;
};

export const WALL_SOURCE_CENTER = new THREE.Vector3(-2.34, 1.4, 0);
export const WALL_SOURCE_OFFSET = WALL_SOURCE_CENTER.clone().multiplyScalar(-1);
export const WALL_DOOR_SOURCE_OFFSET = new THREE.Vector3(0, -1.4, -2.34);
export const CEILING_POSITION = new THREE.Vector3(0, -0.8, 0);
export const CEILING_CENTER = new THREE.Vector3(0, 2.86, 0);
export const CEILING_INWARD_NORMAL = new THREE.Vector3(0, -1, 0);
export const WINDOW_POSITION = new THREE.Vector3(2.34, 1.8, 0);
export const WINDOW_SOURCE_OFFSET = WINDOW_POSITION.clone().multiplyScalar(-1);
export const WINDOW_INWARD_NORMAL = new THREE.Vector3(-1, 0, 0);
export const WEST_WALL_INNER_X = -2.28;
export const BED_FLOOR_Y = 0;
export const BED_CENTER_Z = 0;
export const STOOL_POSITION = new THREE.Vector3(1, 0, -2);

export const WALL_PLACEMENTS = [
  {
    name: 'Wall_North',
    position: new THREE.Vector3(0, 1.4, -2.34),
    rotationY: Math.PI / 2,
    inwardNormal: new THREE.Vector3(0, 0, 1),
  },
  {
    name: 'Wall_West',
    position: new THREE.Vector3(-2.34, 1.4, 0),
    rotationY: 0,
    inwardNormal: new THREE.Vector3(1, 0, 0),
  },
  {
    name: 'Wall_South',
    position: new THREE.Vector3(0, 1.4, 2.34),
    rotationY: 0, // Door wall is authored on +Z, left when facing the headboard.
    inwardNormal: new THREE.Vector3(0, 0, -1),
  },
] as const;
