'use client';
import { useLoader } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useRef } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FileLoader } from 'three';
import { BEDDING_MODEL_PATHS, DUVET_ASSETS, ROOM_MODEL_PATHS } from './config';

export function BackgroundBedPreloader({
  enabled,
  onStart,
}: {
  enabled: boolean;
  onStart?: () => void;
}) {
  useEffect(() => {
    if (!enabled) return;
    const preload = () => {
      onStart?.();
      BEDDING_MODEL_PATHS.forEach((path) =>
        useLoader.preload(GLTFLoader, path),
      );
      Object.values(DUVET_ASSETS).forEach((asset) =>
        useLoader.preload(FileLoader, asset.binding),
      );
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 250);
    return () => clearTimeout(id);
  }, [enabled, onStart]);
  return null;
}

function ModelReady({
  path,
  onReady,
}: {
  path: string;
  onReady: (path: string) => void;
}) {
  useLoader(GLTFLoader, path);
  useEffect(() => onReady(path), [onReady, path]);
  return null;
}

export function RoomAssetPreloader({
  onReady,
  onProgress,
  paths = ROOM_MODEL_PATHS,
}: {
  onReady: () => void;
  onProgress?: (percentage: number) => void;
  paths?: readonly string[];
}) {
  const batch = useRef({ paths, completed: new Set<string>() });
  const markReady = useCallback(
    (path: string) => {
      if (batch.current.paths !== paths)
        batch.current = { paths, completed: new Set<string>() };
      batch.current.completed.add(path);
      onProgress?.(
        Math.round((batch.current.completed.size / paths.length) * 100),
      );
      if (batch.current.completed.size === paths.length) onReady();
    },
    [paths, onReady, onProgress],
  );
  return (
    <>
      {paths.map((path) => (
        <Suspense key={path} fallback={null}>
          <ModelReady path={path} onReady={markReady} />
        </Suspense>
      ))}
    </>
  );
}
