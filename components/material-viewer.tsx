'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { PILLOW_PALETTE } from './room/config';
import textureBundles, { type TextureBundle } from 'virtual:texture-bundles';

import {
  DEFAULT_SETTINGS,
  DUVET_FACE_REPEAT,
  type DuvetRepeatMode,
  type ViewerSettings,
} from '@/components/texture/config';
import { RenderScene } from '@/components/texture/render-scene';
import { TextureControlPanel } from '@/components/ui/texture/texture-control-panel';
import { TextureStageOverlay } from '@/components/ui/texture/texture-stage-overlay';

import shellStyles from './viewer-shell.module.css';

const DEFAULT_TEXTURE_BUNDLE =
  textureBundles.find((bundle) => bundle.name === 'Spatially_bio_v3_2K') ??
  textureBundles[0];

export function MaterialViewer() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [duvetRepeatMode, setDuvetRepeatMode] =
    useState<DuvetRepeatMode>('physical');
  const [stochasticTiling, setStochasticTiling] = useState(true);
  const [colorSource, setColorSource] = useState('bundle');
  const [duvetPhysicalRepeat, setDuvetPhysicalRepeat] =
    useState<readonly [number, number]>(DUVET_FACE_REPEAT);
  const [selectedBundle, setSelectedBundle] = useState<
    TextureBundle | undefined
  >(DEFAULT_TEXTURE_BUNDLE);
  const texturePaths = useMemo(() => {
    if (!selectedBundle) return [];
    const palette = PILLOW_PALETTE.find((color) => color.id === colorSource);
    return selectedBundle.paths.map((path, index) =>
      index === 0 && palette ? palette.path : path,
    );
  }, [selectedBundle, colorSource]);

  const handleDuvetRepeatCalculated = useCallback(
    (repeat: readonly [number, number]) => {
      setDuvetPhysicalRepeat((current) =>
        current[0] === repeat[0] && current[1] === repeat[1] ? current : repeat,
      );
    },
    [],
  );
  const update = <K extends keyof ViewerSettings>(
    key: K,
    value: ViewerSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };
  const reset = () => {
    setReady(false);
    setSettings(DEFAULT_SETTINGS);
    setSelectedBundle(DEFAULT_TEXTURE_BUNDLE);
    setDuvetRepeatMode('physical');
    setStochasticTiling(true);
    setColorSource('bundle');
    setResetKey((key) => key + 1);
  };
  const selectTexture = (bundle: TextureBundle) => {
    setReady(false);
    setSelectedBundle(bundle);
  };

  return (
    <main className={shellStyles.shell}>
      <section
        className={shellStyles.stage}
        aria-label="Interactive 3D material preview"
      >
        <Canvas
          dpr={[1, 1.75]}
          camera={{
            position: [1.62, 0.72, 0.92],
            fov: 45,
            near: 0.05,
            far: 100,
          }}
          gl={async (props) => {
            const { WebGPURenderer } = await import('three/webgpu');
            const renderer = new WebGPURenderer({
              canvas: props.canvas as HTMLCanvasElement,
              antialias: true,
              alpha: false,
            });
            await renderer.init();
            return renderer;
          }}
        >
          <Suspense fallback={null}>
            {selectedBundle && (
              <RenderScene
                settings={settings}
                texturePaths={texturePaths}
                duvetRepeatMode={duvetRepeatMode}
                stochasticTiling={stochasticTiling}
                onDuvetRepeatCalculated={handleDuvetRepeatCalculated}
                resetKey={resetKey}
                onReady={() => setReady(true)}
              />
            )}
          </Suspense>
        </Canvas>
        <TextureStageOverlay ready={ready} />
      </section>

      <TextureControlPanel
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        settings={settings}
        onSettingChange={update}
        onReset={reset}
        stochasticTiling={stochasticTiling}
        onStochasticTilingChange={setStochasticTiling}
        duvetRepeatMode={duvetRepeatMode}
        duvetPhysicalRepeat={duvetPhysicalRepeat}
        onDuvetRepeatModeChange={setDuvetRepeatMode}
        selectedBundle={selectedBundle}
        onTextureSelect={selectTexture}
        colorSource={colorSource}
        onColorSourceChange={(value) => {
          setReady(false);
          setColorSource(value);
        }}
      />
    </main>
  );
}
