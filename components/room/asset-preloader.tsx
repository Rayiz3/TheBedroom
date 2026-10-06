'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
  DUVET_ASSETS,
  ROOM_MODEL_PATHS,
  FABRIC_DATA_TEXTURE_PATHS,
} from './config';

import { DEFAULT_FABRIC_COLOR_PATH } from './fabric-colors';

export function RoomAssetPreloader({ onReady }: { onReady: () => void }) {
  const models = useLoader(GLTFLoader, [...ROOM_MODEL_PATHS]);
  const bindings = useLoader(
    THREE.FileLoader,
    Object.values(DUVET_ASSETS).map((asset) => asset.binding),
  );
  const textures = useLoader(THREE.TextureLoader, [
    ...FABRIC_DATA_TEXTURE_PATHS,
  ]);
  const colors = useLoader(THREE.TextureLoader, DEFAULT_FABRIC_COLOR_PATH);

  useEffect(() => {
    onReady();
  }, [models, bindings, onReady, textures, colors]);
  return null;
}
