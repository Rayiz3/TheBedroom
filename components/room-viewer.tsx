'use client';

import { Canvas, addAfterEffect } from '@react-three/fiber';
import { Suspense, useCallback, useState, useEffect, useRef } from 'react';
import { roomPerformance } from './room/performance';
import { RoomProductPanel } from './ui/room/room-product-panel';
import * as THREE from 'three';

import { RoomFurniture, RoomStool } from '@/components/room/room-furniture';
import { RoomAssetPreloader } from '@/components/room/asset-preloader';
import { StaticRoomArchitecture } from '@/components/room/architecture';
import { BedScene } from '@/components/room/bed-scene';
import {
  BED_MODEL_PATHS,
  DEFAULT_LIGHTING,
  DEFAULT_PILLOW_PALETTE,
  type BedSize,
  type BeddingPalette,
} from '@/components/room/config';
import { RoomEnvironment } from '@/components/room/environment';
import { BlenderLighting } from '@/components/room/lighting';
import { RoomControlPanel } from '@/components/ui/room/room-control-panel';
import { RoomStageOverlay } from '@/components/ui/room/room-stage-overlay';
import { RoomViewerBoundary } from '@/components/ui/room/room-viewer-boundary';
import { ViewerNavigation } from '@/components/viewer-navigation';

import styles from './room-viewer.module.css';
import shellStyles from './viewer-shell.module.css';

export function RoomViewer() {
  const [initialFrameReady, setInitialFrameReady] = useState(false);
  const timing = useRef({
    initial: 0,
    pending: null as number | null,
    committed: false,
    ready: false,
    measured: false,
  });
  useEffect(() => {
    timing.current.initial = performance.now();
    roomPerformance.resetRecording();
    roomPerformance.publish({ initialMs: null, updateMs: null });
    return addAfterEffect(() => {
      const t = timing.current;
      if (!t.ready) return;
      if (!t.measured) {
        t.measured = true;
        // Reveal only after a frame with final placement and camera was submitted.
        setInitialFrameReady(true);
        roomPerformance.publish({ initialMs: performance.now() - t.initial });
      }
      if (t.pending !== null && t.committed) {
        roomPerformance.publish({ updateMs: performance.now() - t.pending });
        t.pending = null;
      }
    });
  }, []);
  const measureChange =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      timing.current.pending = performance.now();
      timing.current.committed = false;
      setter(value);
    };
  const [environmentReady, setEnvironmentReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showColliders, setShowColliders] = useState(false);
  const [bedSize, setBedSize] = useState<BedSize>('queen');
  const [palette, setpalette] = useState<BeddingPalette>({
    pad: DEFAULT_PILLOW_PALETTE,
    pillow1: DEFAULT_PILLOW_PALETTE,
    pillow2: DEFAULT_PILLOW_PALETTE,
    duvet: DEFAULT_PILLOW_PALETTE,
  });
  const [hdriIntensity, setHdriIntensity] = useState<number>(
    DEFAULT_LIGHTING.hdriIntensity,
  );
  const [ambientIntensity, setAmbientIntensity] = useState<number>(
    DEFAULT_LIGHTING.ambientIntensity,
  );
  const [directionalIntensity, setDirectionalIntensity] = useState<number>(
    DEFAULT_LIGHTING.directionalIntensity,
  );
  const [directionalDirection, setDirectionalDirection] = useState<number>(
    DEFAULT_LIGHTING.directionalDirection,
  );
  const [directionalElevation, setDirectionalElevation] = useState<number>(
    DEFAULT_LIGHTING.directionalElevation,
  );

  const modelPath = BED_MODEL_PATHS[bedSize];
  const ready = environmentReady && assetsReady && sceneReady;
  useEffect(() => {
    timing.current.ready = ready;
    timing.current.committed = true;
  }, [
    ready,
    bedSize,
    palette,
    hdriIntensity,
    ambientIntensity,
    directionalIntensity,
    directionalDirection,
    directionalElevation,
    showColliders,
  ]);
  const handleEnvironmentReady = useCallback(
    () => setEnvironmentReady(true),
    [],
  );
  const handleAssetsReady = useCallback(() => setAssetsReady(true), []);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const handleError = useCallback(() => setFailed(true), []);
  const handleRetry = useCallback(() => {
    setInitialFrameReady(false);
    timing.current.measured = false;
    timing.current.ready = false;
    timing.current.initial = performance.now();
    setAssetsReady(false);
    setSceneReady(false);
    setFailed(false);
  }, []);
  const handleBedSizeChange = useCallback((next: BedSize) => {
    setFailed(false);
    setBedSize(next);
  }, []);

  return (
    <main className={`${shellStyles.shell} ${styles.viewer}`}>
      <section
        className={shellStyles.stage}
        aria-label={`${bedSize === 'single' ? '싱글' : '퀸'} 침대 3D 룸 프리뷰`}
      >
        <RoomViewerBoundary
          modelPath={modelPath}
          onError={handleError}
          onRetry={handleRetry}
        >
          <Canvas
            style={{ visibility: initialFrameReady ? 'visible' : 'hidden' }}
            shadows
            dpr={[1, 1.75]}
            camera={{ position: [3, 2, 4], fov: 38, near: 0.05, far: 100 }}
            gl={{ antialias: true, alpha: false }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.AgXToneMapping;
              gl.toneMappingExposure = 2 ** 0.85;
              gl.outputColorSpace = THREE.SRGBColorSpace;
            }}
          >
            <Suspense fallback={null}>
              <RoomEnvironment
                intensity={hdriIntensity}
                onReady={handleEnvironmentReady}
              />
            </Suspense>
            <Suspense fallback={null}>
              <RoomAssetPreloader onReady={handleAssetsReady} />
            </Suspense>
            <Suspense fallback={null}>
              <BlenderLighting
                ambientIntensity={ambientIntensity}
                directionalIntensity={directionalIntensity}
                directionalDirection={directionalDirection}
                directionalElevation={directionalElevation}
              />
              <StaticRoomArchitecture />
              <RoomStool />
            </Suspense>
            <Suspense fallback={null}>
              <RoomFurniture bedSize={bedSize} />
            </Suspense>
            <Suspense fallback={null}>
              {environmentReady && assetsReady && (
                <BedScene
                  bedSize={bedSize}
                  modelPath={modelPath}
                  palette={palette}
                  showColliders={showColliders}
                  onReady={handleSceneReady}
                />
              )}
            </Suspense>
          </Canvas>
        </RoomViewerBoundary>
        <RoomStageOverlay
          ready={ready && initialFrameReady}
          failed={failed}
          modelPath={modelPath}
        />
      </section>

      <RoomControlPanel
        showColliders={showColliders}
        onShowCollidersChange={measureChange(setShowColliders)}
        collapsed={panelCollapsed}
        onCollapsedChange={setPanelCollapsed}
        hdriIntensity={hdriIntensity}
        onHdriIntensityChange={measureChange(setHdriIntensity)}
        ambientIntensity={ambientIntensity}
        onAmbientIntensityChange={measureChange(setAmbientIntensity)}
        directionalIntensity={directionalIntensity}
        onDirectionalIntensityChange={measureChange(setDirectionalIntensity)}
        directionalDirection={directionalDirection}
        onDirectionalDirectionChange={measureChange(setDirectionalDirection)}
        directionalElevation={directionalElevation}
        onDirectionalElevationChange={measureChange(setDirectionalElevation)}
      />
      <RoomProductPanel
        bedSize={bedSize}
        onBedSizeChange={measureChange(handleBedSizeChange)}
        palette={palette}
        onPaletteChange={measureChange(setpalette)}
      />
      <ViewerNavigation currentView="Room View" />
    </main>
  );
}
