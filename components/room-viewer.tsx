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
  type BeddingColor,
  type RoomHdri,
} from '@/components/room/config';
import { RoomEnvironment, BlenderLighting } from '@/components/room/lighting';
import { CeilingLamp } from '@/components/room/ceiling-lamp';
import { RoomControlPanel } from '@/components/ui/room/room-control-panel';
import { RoomStageOverlay } from '@/components/ui/room/room-stage-overlay';
import { RoomViewerBoundary } from '@/components/ui/room/room-viewer-boundary';
import { ViewerNavigation } from '@/components/viewer-navigation';

import styles from './room-viewer.module.css';
import shellStyles from './viewer-shell.module.css';
import { ConfiguratorPanel } from './ui/configurator/configurator-panel';
import configuratorStyles from './ui/configurator/configurator.module.css';
import Link from 'next/link';
import { ArrowLeft, Move } from 'lucide-react';

export function RoomViewer({
  variant = 'room',
}: {
  variant?: 'room' | 'configurator';
}) {
  const isConfigurator = variant === 'configurator';
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
      setEnvironmentSaveMessage('');
      setter(value);
    };
  const [environmentReady, setEnvironmentReady] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showColliders, setShowColliders] = useState(false);
  const [bedSize, setBedSize] = useState<BedSize>('queen');
  const [bulkPaletteRevision, setBulkPaletteRevision] = useState(0);
  const [palette, setpalette] = useState<BeddingPalette>({
    pad: DEFAULT_PILLOW_PALETTE,
    pillow1: DEFAULT_PILLOW_PALETTE,
    pillow2: DEFAULT_PILLOW_PALETTE,
    duvet: DEFAULT_PILLOW_PALETTE,
  });
  const handleBulkPaletteChange = (color: BeddingColor) => {
    setpalette({ duvet: color, pad: color, pillow1: color, pillow2: color });
    setBulkPaletteRevision((revision) => revision + 1);
  };
  const [hdriSource, setHdriSource] = useState<RoomHdri>(
    DEFAULT_LIGHTING.hdriSource as RoomHdri,
  );
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
  const [environmentSaveMessage, setEnvironmentSaveMessage] = useState('');
  const [ceilingLightIntensity, setCeilingLightIntensity] = useState(
    DEFAULT_LIGHTING.ceilingLightIntensity,
  );
  const [ceilingLightTemperature, setCeilingLightTemperature] = useState(
    DEFAULT_LIGHTING.ceilingLightTemperature,
  );

  const restoreEnvironmentDefaults = () => {
    setHdriSource(DEFAULT_LIGHTING.hdriSource as RoomHdri);
    setHdriIntensity(DEFAULT_LIGHTING.hdriIntensity);
    setAmbientIntensity(DEFAULT_LIGHTING.ambientIntensity);
    setDirectionalIntensity(DEFAULT_LIGHTING.directionalIntensity);
    setDirectionalDirection(DEFAULT_LIGHTING.directionalDirection);
    setDirectionalElevation(DEFAULT_LIGHTING.directionalElevation);
    setCeilingLightIntensity(DEFAULT_LIGHTING.ceilingLightIntensity);
    setCeilingLightTemperature(DEFAULT_LIGHTING.ceilingLightTemperature);
    setEnvironmentSaveMessage('JSON에 저장된 기본값으로 되돌렸습니다.');
  };
  const saveEnvironmentDefaults = async () => {
    try {
      const response = await fetch('/api/room/environment-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hdriSource,
          hdriIntensity,
          ambientIntensity,
          directionalIntensity,
          directionalDirection,
          directionalElevation,
          ceilingLightIntensity,
          ceilingLightTemperature,
        }),
      });
      if (!response.ok) throw new Error('Save failed');
      setEnvironmentSaveMessage('현재 값을 기본값 JSON에 저장했습니다.');
    } catch {
      setEnvironmentSaveMessage(
        '저장하지 못했습니다. JSON 저장은 로컬 개발 서버에서 지원됩니다.',
      );
    }
  };

  const modelPath = BED_MODEL_PATHS[bedSize];
  const ready = environmentReady && assetsReady && sceneReady;
  useEffect(() => {
    timing.current.ready = ready;
    timing.current.committed = true;
  }, [
    ready,
    bedSize,
    palette,
    hdriSource,
    hdriIntensity,
    ambientIntensity,
    directionalIntensity,
    directionalDirection,
    directionalElevation,
    showColliders,
    ceilingLightIntensity,
    ceilingLightTemperature,
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
    <main
      className={
        isConfigurator
          ? configuratorStyles.shell
          : `${shellStyles.shell} ${styles.viewer}`
      }
    >
      {isConfigurator && (
        <header className={configuratorStyles.header}>
          <Link
            href="/"
            className={configuratorStyles.brand}
            aria-label="Spatially 홈"
          >
            Spatially
          </Link>
          <span className={configuratorStyles.headerTitle}>침실 꾸미기</span>
          <Link href="/" className={configuratorStyles.back}>
            <ArrowLeft size={16} /> 돌아가기
          </Link>
        </header>
      )}
      <section
        className={
          isConfigurator ? configuratorStyles.stage : shellStyles.stage
        }
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
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 3.0;
              gl.outputColorSpace = THREE.SRGBColorSpace;
            }}
          >
            <Suspense fallback={null}>
              <RoomEnvironment
                source={hdriSource}
                intensity={hdriIntensity}
                onReady={handleEnvironmentReady}
              />
            </Suspense>
            <Suspense fallback={null}>
              <RoomAssetPreloader onReady={handleAssetsReady} />
            </Suspense>
            <Suspense fallback={null}>
              <BlenderLighting
                showGuide={!isConfigurator}
                ambientIntensity={ambientIntensity}
                directionalIntensity={directionalIntensity}
                directionalDirection={directionalDirection}
                directionalElevation={directionalElevation}
              />
              <StaticRoomArchitecture />
              <CeilingLamp
                intensity={ceilingLightIntensity}
                temperature={ceilingLightTemperature}
              />
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
                  bulkPaletteRevision={bulkPaletteRevision}
                  showColliders={showColliders}
                  onReady={handleSceneReady}
                />
              )}
            </Suspense>
          </Canvas>
        </RoomViewerBoundary>
        {isConfigurator ? (
          <>
            {!initialFrameReady && !failed && (
              <output className={configuratorStyles.loading} aria-live="polite">
                <span />
                침실을 준비하고 있어요
              </output>
            )}
            {initialFrameReady && !failed && (
              <p className={configuratorStyles.hint}>
                <Move size={14} /> 드래그해서 둘러보세요{' '}
                <span>스크롤로 확대</span>
              </p>
            )}
          </>
        ) : (
          <RoomStageOverlay
            ready={ready && initialFrameReady}
            failed={failed}
            modelPath={modelPath}
          />
        )}
      </section>

      {isConfigurator ? (
        <ConfiguratorPanel
          bedSize={bedSize}
          onBedSizeChange={measureChange(handleBedSizeChange)}
          palette={palette}
          onPaletteChange={measureChange(setpalette)}
          onBulkPaletteChange={measureChange(handleBulkPaletteChange)}
          sunlight={directionalDirection}
          onSunlightChange={measureChange(setDirectionalDirection)}
        />
      ) : (
        <>
          <RoomControlPanel
            ceilingLightIntensity={ceilingLightIntensity}
            onCeilingLightIntensityChange={measureChange(
              setCeilingLightIntensity,
            )}
            ceilingLightTemperature={ceilingLightTemperature}
            onCeilingLightTemperatureChange={measureChange(
              setCeilingLightTemperature,
            )}
            onSaveEnvironmentDefaults={saveEnvironmentDefaults}
            onRestoreEnvironmentDefaults={restoreEnvironmentDefaults}
            environmentSaveMessage={environmentSaveMessage}
            showColliders={showColliders}
            onShowCollidersChange={measureChange(setShowColliders)}
            collapsed={panelCollapsed}
            onCollapsedChange={setPanelCollapsed}
            hdriIntensity={hdriIntensity}
            hdriSource={hdriSource}
            onHdriSourceChange={measureChange(setHdriSource)}
            onHdriIntensityChange={measureChange(setHdriIntensity)}
            ambientIntensity={ambientIntensity}
            onAmbientIntensityChange={measureChange(setAmbientIntensity)}
            directionalIntensity={directionalIntensity}
            onDirectionalIntensityChange={measureChange(
              setDirectionalIntensity,
            )}
            directionalDirection={directionalDirection}
            onDirectionalDirectionChange={measureChange(
              setDirectionalDirection,
            )}
            directionalElevation={directionalElevation}
            onDirectionalElevationChange={measureChange(
              setDirectionalElevation,
            )}
          />
          <RoomProductPanel
            bedSize={bedSize}
            onBedSizeChange={measureChange(handleBedSizeChange)}
            palette={palette}
            onPaletteChange={measureChange(setpalette)}
            onBulkPaletteChange={measureChange(handleBulkPaletteChange)}
          />
          <ViewerNavigation currentView="Room View" />
        </>
      )}
    </main>
  );
}
