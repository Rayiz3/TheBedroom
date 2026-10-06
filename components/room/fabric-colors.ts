'use client';

/* eslint-disable react/react-compiler -- Texture images are updated through Three.js imperative APIs. */
import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { cloneFabricTexture } from '@/lib/fabric-material';
import {
  DEFAULT_PILLOW_PALETTE,
  PILLOW_PALETTE,
  type Palette,
  type BeddingPalette,
} from './config';

export const DEFAULT_FABRIC_COLOR_PATH = PILLOW_PALETTE.find(
  (color) => color.id === DEFAULT_PILLOW_PALETTE,
)!.path;

const pending = new Map<string, Promise<THREE.Texture>>();
function loadColor(path: string) {
  let promise = pending.get(path);
  if (!promise) {
    promise = new THREE.TextureLoader().loadAsync(path).catch((error) => {
      pending.delete(path); // Permit retry on a later selection or mount.
      throw error;
    });
    pending.set(path, promise);
  }
  return promise;
}

export function useDeferredFabricColorMaps(
  repeat: [number, number],
  selection: BeddingPalette,
) {
  const initial = useLoader(THREE.TextureLoader, DEFAULT_FABRIC_COLOR_PATH);
  const maps = useMemo(
    () =>
      Object.fromEntries(
        PILLOW_PALETTE.map(({ id }) => {
          const texture = cloneFabricTexture(
            initial,
            repeat,
            THREE.SRGBColorSpace,
          );
          // Each placeholder needs its own Source: changing one color must not
          // overwrite lilac or another color sharing the original image.
          texture.source = new THREE.Source(initial.image);
          return [id, texture];
        }),
      ) as Record<Palette, THREE.Texture>,
    [initial, repeat],
  );

  useEffect(() => {
    let cancelled = false;
    let secondFrame = 0;
    // Wait until the initial scene has had a chance to paint. Stable map
    // identities avoid rebuilding materials or restarting cloth physics.
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        for (const { id, path } of PILLOW_PALETTE) {
          if (id === DEFAULT_PILLOW_PALETTE) continue;
          void loadColor(path)
            .then((texture) => {
              if (cancelled || maps[id].image === texture.image) return;
              maps[id].image = texture.image;
              maps[id].needsUpdate = true;
            })
            .catch((error) => {
              if (!cancelled)
                console.error('Fabric color loading failed:', id, error);
            });
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [maps, selection]);
  // The owning BedScene disposes these maps alongside its other fabric maps.
  return maps;
}
