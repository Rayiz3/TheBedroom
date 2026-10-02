'use client';

import { useLoader } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { initializePillowPhysics } from './physics/pillow/runtime';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import {
  DUVET_ASSETS,
  ROOM_MODEL_PATHS,
  PILLOW_FABRIC_DATA_TEXTURE_PATHS,
} from './config';

import { DEFAULT_FABRIC_COLOR_PATH } from './fabric-colors';

export function RoomAssetPreloader({ onReady }: { onReady: () => void }) {
  const [error, setError] = useState<Error | null>(null);
  const models = useLoader(GLTFLoader, [...ROOM_MODEL_PATHS]);
  const bindings = useLoader(
    THREE.FileLoader,
    Object.values(DUVET_ASSETS).map((asset) => asset.binding),
  );
  const textures = useLoader(THREE.TextureLoader, [
    ...PILLOW_FABRIC_DATA_TEXTURE_PATHS,
  ]);
  const colors = useLoader(THREE.TextureLoader, DEFAULT_FABRIC_COLOR_PATH);

  useEffect(() => {
    let cancelled = false;
    initializePillowPhysics()
      .then(() => {
        if (!cancelled) onReady();
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error ? reason : new Error(String(reason)),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [models, bindings, onReady, textures, colors]);
  if (error) throw error;
  return null;
}
