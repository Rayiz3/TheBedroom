'use client';
import { useLoader } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useRef } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ROOM_MODEL_PATHS } from './config';

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
