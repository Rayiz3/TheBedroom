'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/addons/controls/OrbitControls.js';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type ViewerSettings = {
  exposure: number;
  envIntensity: number;
  roughness: number;
  clearcoat: number;
  normalScale: number;
  displacement: number;
  backgroundBlur: number;
  environmentRotation: number;
  showEnvironment: boolean;
  autoRotate: boolean;
};

const DEFAULT_SETTINGS: ViewerSettings = {
  exposure: 1,
  envIntensity: 1.15,
  roughness: 0.42,
  clearcoat: 0.22,
  normalScale: 0.85,
  displacement: 0.018,
  backgroundBlur: 0.08,
  environmentRotation: 0,
  showEnvironment: true,
  autoRotate: false,
};

const FABRIC_PATHS = [
  '/assets/fabric/color.jpg',
  '/assets/fabric/roughness.jpg',
  '/assets/fabric/normal-gl.jpg',
  '/assets/fabric/displacement.jpg',
  '/assets/fabric/ao.jpg',
] as const;

function CameraControls({ autoRotate, resetKey }: { autoRotate: boolean; resetKey: number }) {
  const { camera, gl } = useThree();
  const controls = useMemo(() => new OrbitControlsImpl(camera, gl.domElement), [camera, gl]);

  useEffect(() => {
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 2;
    controls.maxDistance = 2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.62;
    controls.autoRotateSpeed = 0.72;
    controls.update();
    return () => controls.dispose();
  }, [controls]);

  useEffect(() => {
    camera.position.set(1.62, 0.72, 0.92).normalize().multiplyScalar(2);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
  }, [camera, controls, resetKey]);

  useFrame(() => {
    controls.autoRotate = autoRotate;
    controls.update();
  });

  return null;
}

function Environment({ settings }: { settings: ViewerSettings }) {
  const { scene, gl } = useThree();
  const environment = useLoader(THREE.TextureLoader, '/assets/environment/indoor-001-tonemapped.jpg');

  useEffect(() => {
    environment.colorSpace = THREE.SRGBColorSpace;
    environment.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = environment;
    scene.background = settings.showEnvironment ? environment : new THREE.Color('#11140f');
    scene.backgroundBlurriness = settings.backgroundBlur;
    scene.environmentIntensity = settings.envIntensity;
    scene.backgroundIntensity = 1;
    scene.environmentRotation.y = settings.environmentRotation;
    scene.backgroundRotation.y = settings.environmentRotation;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = settings.exposure;
    gl.outputColorSpace = THREE.SRGBColorSpace;

    return () => {
      scene.environment = null;
      scene.background = null;
    };
  }, [environment, gl, scene, settings]);

  return null;
}

function FabricSphere({ settings, onReady }: { settings: ViewerSettings; onReady: () => void }) {
  const textures = useLoader(THREE.TextureLoader, [...FABRIC_PATHS]);
  const [colorMap, roughnessMap, normalMap, displacementMap, aoMap] = textures;
  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(0.52, 256, 192);
    sphere.setAttribute('uv1', sphere.attributes.uv);
    return sphere;
  }, []);

  useEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    for (const texture of textures) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2.25, 2.25);
      texture.anisotropy = 8;
      texture.needsUpdate = true;
    }
    onReady();
    return () => geometry.dispose();
  }, [colorMap, geometry, onReady, textures]);

  return (
    <mesh geometry={geometry} position={[0, 0, 0]} castShadow receiveShadow>
      <meshPhysicalMaterial
        map={colorMap}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        displacementMap={displacementMap}
        aoMap={aoMap}
        roughness={settings.roughness}
        clearcoat={settings.clearcoat}
        clearcoatRoughness={0.22}
        normalScale={new THREE.Vector2(settings.normalScale, settings.normalScale)}
        displacementScale={settings.displacement}
        envMapIntensity={settings.envIntensity}
      />
    </mesh>
  );
}

function RenderScene({
  settings,
  resetKey,
  onReady,
}: {
  settings: ViewerSettings;
  resetKey: number;
  onReady: () => void;
}) {
  return (
    <>
      <Environment settings={settings} />
      <FabricSphere settings={settings} onReady={onReady} />
      <CameraControls autoRotate={settings.autoRotate} resetKey={resetKey} />
    </>
  );
}

type ControlRowProps = {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
};

function ControlRow({ label, value, display, min, max, step, onValueChange }: ControlRowProps) {
  return (
    <label className="control-row">
      <span className="control-row__meta">
        <span>{label}</span>
        <output>{display}</output>
      </span>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => onValueChange(Array.isArray(next) ? (next[0] ?? value) : next)}
      />
    </label>
  );
}

export function MaterialViewer() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const rendererLabel = typeof navigator !== 'undefined' && 'gpu' in navigator ? 'WEBGPU' : 'WEBGL 2 FALLBACK';

  const update = <K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    setResetKey((key) => key + 1);
  };

  return (
    <main className="viewer-shell">
      <section className="render-stage" aria-label="Interactive 3D material preview">
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [1.62, 0.72, 0.92], fov: 45, near: 0.05, far: 100 }}
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
            <RenderScene settings={settings} resetKey={resetKey} onReady={() => setReady(true)} />
          </Suspense>
        </Canvas>

        <div className="viewer-brand">
          <span className="viewer-brand__mark" aria-hidden="true" />
          <div>
            <strong>Material Study</strong>
            <span>Fabric 061 · Indoor Environment 001</span>
          </div>
        </div>

        <div className="viewer-status" aria-live="polite">
          <span className={ready ? 'status-dot is-ready' : 'status-dot'} />
          {ready ? rendererLabel : 'LOADING 4K ENVIRONMENT'}
        </div>

        {!ready && (
          <div className="loading-state">
            <span className="loading-ring" aria-hidden="true" />
            <p>Building the light</p>
          </div>
        )}

        <p className="viewer-hint">Drag to orbit · Camera distance locked at 2m</p>
      </section>

      <aside className={collapsed ? 'control-panel is-collapsed' : 'control-panel'} aria-label="Render controls">
        <div className="control-panel__head">
          {!collapsed && (
            <div>
              <span className="eyebrow">LIVE MATERIAL</span>
              <h1>Scene controls</h1>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="panel-toggle"
            aria-label={collapsed ? 'Expand controls' : 'Collapse controls'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? <ChevronLeft /> : <ChevronRight />}
          </Button>
        </div>

        {!collapsed && (
          <div className="control-panel__body">
            <p className="control-copy">Tune the fabric response while the indoor EXR lights the stationary sphere.</p>

            <section className="control-group">
              <div className="control-group__title">
                <span>LIGHT</span>
                <i />
              </div>
              <ControlRow label="Exposure" value={settings.exposure} display={settings.exposure.toFixed(2)} min={0.2} max={2.2} step={0.01} onValueChange={(value) => update('exposure', value)} />
              <ControlRow label="Environment" value={settings.envIntensity} display={settings.envIntensity.toFixed(2)} min={0} max={2.5} step={0.01} onValueChange={(value) => update('envIntensity', value)} />
              <ControlRow label="Background blur" value={settings.backgroundBlur} display={`${Math.round(settings.backgroundBlur * 100)}%`} min={0} max={1} step={0.01} onValueChange={(value) => update('backgroundBlur', value)} />
              <ControlRow label="Rotation" value={settings.environmentRotation} display={`${Math.round(THREE.MathUtils.radToDeg(settings.environmentRotation))}°`} min={-Math.PI} max={Math.PI} step={0.01} onValueChange={(value) => update('environmentRotation', value)} />
            </section>

            <section className="control-group">
              <div className="control-group__title">
                <span>MATERIAL</span>
                <i />
              </div>
              <ControlRow label="Roughness" value={settings.roughness} display={settings.roughness.toFixed(2)} min={0.05} max={1} step={0.01} onValueChange={(value) => update('roughness', value)} />
              <ControlRow label="Clearcoat" value={settings.clearcoat} display={settings.clearcoat.toFixed(2)} min={0} max={1} step={0.01} onValueChange={(value) => update('clearcoat', value)} />
              <ControlRow label="Normal strength" value={settings.normalScale} display={settings.normalScale.toFixed(2)} min={0} max={2} step={0.01} onValueChange={(value) => update('normalScale', value)} />
              <ControlRow label="Displacement" value={settings.displacement} display={settings.displacement.toFixed(3)} min={0} max={0.05} step={0.001} onValueChange={(value) => update('displacement', value)} />
            </section>

            <section className="control-group switches">
              <label htmlFor="environment-background">
                <span>Environment background</span>
                <Switch id="environment-background" checked={settings.showEnvironment} onCheckedChange={(checked) => update('showEnvironment', checked)} aria-label="Show environment background" />
              </label>
              <label htmlFor="auto-orbit">
                <span>Auto orbit</span>
                <Switch id="auto-orbit" checked={settings.autoRotate} onCheckedChange={(checked) => update('autoRotate', checked)} aria-label="Auto orbit camera" />
              </label>
            </section>

            <Button type="button" variant="outline" className="reset-button" onClick={reset}>
              <RotateCcw /> Reset scene
            </Button>
          </div>
        )}
      </aside>
    </main>
  );
}
