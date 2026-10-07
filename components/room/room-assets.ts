import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DUVET_ASSETS, ROOM_MODEL_PATHS } from './config';

// Cache each asset independently so the configurator can defer the room.
export const ROOM_BINDING_PATHS = Object.values(DUVET_ASSETS).map(
  (asset) => asset.binding,
);
export function useRoomModel(path: string) {
  if (!(ROOM_MODEL_PATHS as readonly string[]).includes(path))
    throw new Error('Unknown room model: ' + path);
  return useLoader(GLTFLoader, path);
}
export function useRoomBinding(path: string) {
  return useLoader(THREE.FileLoader, path);
}
