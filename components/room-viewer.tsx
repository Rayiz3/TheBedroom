'use client';
/* eslint-disable react/react-compiler -- Intro state is an imperative Three.js animation controller; React tracks phase changes only. */

import { Canvas, addAfterEffect } from '@react-three/fiber';
import {
  Suspense,
  useCallback,
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { createIntroState, type IntroPhase } from './room/intro-state';
import { IntroCamera, RevealRoom } from './room/configurator-intro';
import { ConfiguratorLoading } from './ui/configurator/configurator-loading';
import { CeilingAreaLights } from './room/lighting/rect-area-light';
import { roomPerformance } from './room/performance';
import { RoomProductPanel } from './ui/room/room-product-panel';
import * as THREE from 'three';

import { RoomFurniture, RoomStool } from '@/components/room/room-furniture';
import {
  BackgroundBedPreloader,
  RoomAssetPreloader,
} from '@/components/room/asset-preloader';
import { StaticRoomArchitecture } from '@/components/room/architecture';
import { BedScene } from '@/components/room/bed-scene';
import {
  BED_MODEL_PATHS,
  BEDDING_MODEL_PATHS,
  PILLOW_MODEL_PATHS,
  PAD_MODEL_PATHS,
  DUVET_ASSETS,
  ROOM_MODEL_PATHS,
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
import { Move } from 'lucide-react';

const ignoreReady = () => {};

export function RoomViewer({
  variant = 'room',
}: {
  variant?: 'room' | 'configurator';
}) {
  const [intro, setIntro] = useState(createIntroState);
  const [introPhase, setIntroPhase] = useState<IntroPhase>('bed');
  const [bedLoadProgress, setBedLoadProgress] = useState(0);
  const [roomAssetProgress, setRoomAssetProgress] = useState(0);
  const [preparedStageCount, setPreparedStageCount] = useState(0);
  const [ceilingLightEnabled, setCeilingLightEnabled] = useState(true);
  const toggleCeilingLight = useCallback(
    () => setCeilingLightEnabled((enabled) => !enabled),
    [],
  );
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
        if (isConfigurator) {
          intro.phase = 'room';
          setIntroPhase('room');
        }
        roomPerformance.publish({ initialMs: performance.now() - t.initial });
      }
      if (t.pending !== null && t.committed) {
        roomPerformance.publish({ updateMs: performance.now() - t.pending });
        t.pending = null;
      }
    });
  }, [intro, isConfigurator]);
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
  const [warmBeds, setWarmBeds] = useState(false);
  const preparation = useRef({ room: false, queen: false, single: false });
  const startBedPreparation = useCallback(() => setWarmBeds(true), []);
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

  const bedPaths = useMemo<readonly string[]>(
    () => [
      BED_MODEL_PATHS[bedSize],
      PILLOW_MODEL_PATHS[bedSize],
      PAD_MODEL_PATHS[bedSize],
      DUVET_ASSETS[bedSize].model,
    ],
    [bedSize],
  );
  const remainingPaths = useMemo(
    () =>
      ROOM_MODEL_PATHS.filter((path) => !BEDDING_MODEL_PATHS.includes(path)),
    [],
  );
  const handleRoomReady = useCallback(() => {
    if (intro.phase !== 'room') return;
    preparation.current.room = true;
    setPreparedStageCount(
      Object.values(preparation.current).filter(Boolean).length,
    );
    intro.roomReady = preparation.current.queen && preparation.current.single;
  }, [intro]);
  const handleQueenPrepared = useCallback(() => {
    preparation.current.queen = true;
    setPreparedStageCount(
      Object.values(preparation.current).filter(Boolean).length,
    );
    intro.roomReady = preparation.current.room && preparation.current.single;
  }, [intro]);
  const handleSinglePrepared = useCallback(() => {
    preparation.current.single = true;
    setPreparedStageCount(
      Object.values(preparation.current).filter(Boolean).length,
    );
    intro.roomReady = preparation.current.room && preparation.current.queen;
  }, [intro]);
  const handleReveal = useCallback(() => setIntroPhase('reveal'), []);
  const handleIntroComplete = useCallback(() => setIntroPhase('ready'), []);
  const interactive = !isConfigurator || introPhase === 'ready';
  // Each room GLB and each completed GPU preparation is one finished task.
  // Loading files alone cannot report 100% while the room or beds are preparing.
  const roomLoadProgress = Math.round(
    (roomAssetProgress * remainingPaths.length + preparedStageCount * 100) /
      (remainingPaths.length + 3),
  );
  const modelPath = BED_MODEL_PATHS[bedSize];
  const ready =
    environmentReady && (isConfigurator || assetsReady) && sceneReady;
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
    preparation.current = { room: false, queen: false, single: false };
    setIntro(createIntroState());
    setIntroPhase('bed');
    setBedLoadProgress(0);
    setRoomAssetProgress(0);
    setPreparedStageCount(0);
    setInitialFrameReady(false);
    timing.current.measured = false;
    timing.current.ready = false;
    timing.current.initial = performance.now();
    setAssetsReady(false);
    setEnvironmentReady(false);
    setSceneReady(false);
    setFailed(false);
  }, []);
  const handleBedSizeChange = useCallback((next: BedSize) => {
    setFailed(false);
    setBedSize(next);
  }, []);

  return (
    <main
      data-intro-phase={isConfigurator ? introPhase : undefined}
      className={
        isConfigurator
          ? configuratorStyles.shell
          : `${shellStyles.shell} ${styles.viewer}`
      }
    >
      {isConfigurator && interactive && (
        <Link
          href="/"
          className={configuratorStyles.brand}
          aria-label="Spatially 홈"
        >
          Spatially
        </Link>
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
            style={{
              visibility: initialFrameReady ? 'visible' : 'hidden',
              pointerEvents: interactive ? 'auto' : 'none',
            }}
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
                intro={isConfigurator ? intro : undefined}
                source={hdriSource}
                intensity={hdriIntensity}
                onReady={handleEnvironmentReady}
              />
            </Suspense>
            <RoomAssetPreloader
              onProgress={
                isConfigurator && !initialFrameReady
                  ? setBedLoadProgress
                  : isConfigurator
                    ? setRoomAssetProgress
                    : undefined
              }
              key={
                isConfigurator ? (initialFrameReady ? 'room' : 'bed') : 'all'
              }
              paths={
                isConfigurator
                  ? initialFrameReady
                    ? remainingPaths
                    : bedPaths
                  : ROOM_MODEL_PATHS
              }
              onReady={
                isConfigurator && !initialFrameReady
                  ? ignoreReady
                  : handleAssetsReady
              }
            />
            <BackgroundBedPreloader
              onStart={startBedPreparation}
              enabled={initialFrameReady}
            />
            <BlenderLighting
              showGuide={!isConfigurator}
              ambientIntensity={ambientIntensity}
              directionalIntensity={directionalIntensity}
              directionalDirection={directionalDirection}
              directionalElevation={directionalElevation}
              intro={isConfigurator ? intro : undefined}
            />
            <CeilingAreaLights
              intensity={ceilingLightEnabled ? ceilingLightIntensity : 0}
              temperature={ceilingLightTemperature}
            />
            {isConfigurator && (
              <>
                <IntroCamera
                  intro={intro}
                  onReveal={handleReveal}
                  onComplete={handleIntroComplete}
                />
              </>
            )}
            {(!isConfigurator || (initialFrameReady && assetsReady)) && (
              <Suspense fallback={null}>
                {isConfigurator ? (
                  <RevealRoom
                    intro={intro}
                    onReady={handleRoomReady}
                    onError={handleError}
                  >
                    <StaticRoomArchitecture
                      lightEnabled={ceilingLightEnabled}
                      onLightToggle={toggleCeilingLight}
                    />
                    <CeilingLamp
                      enabled={ceilingLightEnabled}
                      intensity={ceilingLightIntensity}
                      temperature={ceilingLightTemperature}
                    />
                    <RoomStool />
                    <RoomFurniture bedSize={bedSize} />
                  </RevealRoom>
                ) : (
                  <>
                    <StaticRoomArchitecture
                      lightEnabled={ceilingLightEnabled}
                      onLightToggle={toggleCeilingLight}
                    />
                    <CeilingLamp
                      enabled={ceilingLightEnabled}
                      intensity={ceilingLightIntensity}
                      temperature={ceilingLightTemperature}
                    />
                    <RoomStool />
                    <Suspense fallback={null}>
                      <RoomFurniture bedSize={bedSize} />
                    </Suspense>
                  </>
                )}
              </Suspense>
            )}
            <group>
              {(['queen', 'single'] as const).map((size) => (
                <Suspense key={size} fallback={null}>
                  {(warmBeds ||
                    (isConfigurator && initialFrameReady) ||
                    size === bedSize) &&
                    (isConfigurator || (environmentReady && assetsReady)) && (
                      <BedScene
                        active={size === bedSize}
                        preserveCamera={size !== 'queen'}
                        warmGpu={!isConfigurator || assetsReady}
                        onPrepared={
                          size === 'queen'
                            ? handleQueenPrepared
                            : handleSinglePrepared
                        }
                        onPreparationError={handleError}
                        bedSize={size}
                        modelPath={BED_MODEL_PATHS[size]}
                        palette={palette}
                        bulkPaletteRevision={bulkPaletteRevision}
                        showColliders={showColliders}
                        onReady={handleSceneReady}
                        intro={isConfigurator ? intro : undefined}
                      />
                    )}
                </Suspense>
              ))}
            </group>
          </Canvas>
        </RoomViewerBoundary>
        {isConfigurator ? (
          <>
            {!failed && (
              <ConfiguratorLoading
                phase={introPhase}
                progress={bedLoadProgress}
                roomProgress={roomLoadProgress}
              />
            )}
            {interactive && !failed && (
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
        interactive && (
          <ConfiguratorPanel
            lightEnabled={ceilingLightEnabled}
            onLightToggle={toggleCeilingLight}
            bedSize={bedSize}
            onBedSizeChange={measureChange(handleBedSizeChange)}
            palette={palette}
            onPaletteChange={measureChange(setpalette)}
            onBulkPaletteChange={measureChange(handleBulkPaletteChange)}
            sunlight={directionalDirection}
            onSunlightChange={measureChange(setDirectionalDirection)}
          />
        )
      ) : (
        <>
          <RoomControlPanel
            lightEnabled={ceilingLightEnabled}
            onLightToggle={toggleCeilingLight}
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
