import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DUVET_ASSETS, ROOM_MODEL_PATHS } from './config';

// All consumers select from the same batch cache populated by the preloader.
export const ROOM_BINDING_PATHS = Object.values(DUVET_ASSETS).map(
  (asset) => asset.binding,
);
export function useRoomModel(path: string) {
  const models = useLoader(GLTFLoader, [...ROOM_MODEL_PATHS]);
  const index = ROOM_MODEL_PATHS.findIndex((candidate) => candidate === path);
  if (index < 0) throw new Error('Unknown room model: ' + path);
  return models[index];
}
export function useRoomBinding(path: string) {
  const bindings = useLoader(THREE.FileLoader, ROOM_BINDING_PATHS);
  const index = ROOM_BINDING_PATHS.findIndex((candidate) => candidate === path);
  if (index < 0) throw new Error('Unknown room binding: ' + path);
  return bindings[index];
}
