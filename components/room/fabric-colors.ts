'use client';
import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { cloneFabricTexture } from '@/lib/fabric-material';
import { DEFAULT_PILLOW_PALETTE, PILLOW_PALETTE, type Palette } from './config';

export const DEFAULT_FABRIC_COLOR_PATH = PILLOW_PALETTE.find(
  (color) => color.id === DEFAULT_PILLOW_PALETTE,
)!.path;
const sources = new Map<string, Promise<THREE.Texture>>();
const preparations = new WeakMap<object, Promise<void>>();
export type FabricColorMaps = Record<Palette, THREE.Texture>;

export function useDeferredFabricColorMaps(repeat: [number, number]) {
  const initial = useLoader(THREE.TextureLoader, DEFAULT_FABRIC_COLOR_PATH);
  return useMemo(
    () =>
      Object.fromEntries(
        PILLOW_PALETTE.map(({ id }) => {
          const texture = cloneFabricTexture(
            initial,
            repeat,
            THREE.SRGBColorSpace,
          );
          texture.source = new THREE.Source(initial.image);
          return [id, texture];
        }),
      ) as FabricColorMaps,
    [initial, repeat],
  );
}

/** Stage two owns this promise. No texture is changed later by a background effect. */
export function prepareFabricColors(maps: FabricColorMaps) {
  let preparation = preparations.get(maps);
  if (!preparation) {
    preparation = Promise.all(
      PILLOW_PALETTE.map(async ({ id, path }) => {
        if (id === DEFAULT_PILLOW_PALETTE) return;
        let source = sources.get(path);
        if (!source) {
          source = new THREE.TextureLoader().loadAsync(path).catch((error) => {
            sources.delete(path);
            throw error;
          });
          sources.set(path, source);
        }
        const texture = await source;
        maps[id].image = texture.image;
        maps[id].needsUpdate = true;
      }),
    ).then(() => {});
    preparations.set(maps, preparation);
    void preparation.catch(() => preparations.delete(maps));
  }
  return preparation;
}
