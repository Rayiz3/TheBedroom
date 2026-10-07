'use client';
/* eslint-disable react/react-compiler -- Intro animation mutates Three.js objects without per-frame React renders. */
import { useFrame, useThree } from '@react-three/fiber';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { advanceIntro, type IntroState } from './intro-state';
import { prepareGpu } from './prepare-gpu';

export function IntroCamera({
  intro,
  onComplete,
  onReveal,
}: {
  intro: IntroState;
  onComplete: () => void;
  onReveal: () => void;
}) {
  const { get, set, size } = useThree();
  const orthographic = useMemo(() => new THREE.OrthographicCamera(), []);
  const reduced = useRef(false);
  useLayoutEffect(() => {
    const original = get().camera;
    return () => {
      if (get().camera === orthographic) set({ camera: original });
    };
  }, [get, set, orthographic, intro]);
  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reduced.current = query.matches;
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useFrame((_, delta) => {
    if (!intro.cameraReady || !intro.perspective) return;
    if (intro.phase === 'bed' || intro.phase === 'room') {
      const halfHeight = intro.topViewHeight / 2;
      const aspect = size.width / size.height;
      orthographic.left = -halfHeight * aspect;
      orthographic.right = halfHeight * aspect;
      orthographic.top = halfHeight;
      orthographic.bottom = -halfHeight;
      orthographic.near = intro.perspective.near;
      orthographic.far = intro.perspective.far;
      orthographic.position.copy(intro.top);
      orthographic.up.set(-1, 0, 0);
      orthographic.lookAt(intro.target);
      orthographic.updateProjectionMatrix();
      if (get().camera !== orthographic) set({ camera: orthographic });
    }
    const phase = advanceIntro(
      intro,
      intro.perspective,
      delta,
      reduced.current,
      performance.now(),
    );
    if (phase === 'reveal') {
      set({ camera: intro.perspective });
      onReveal();
    }
    if (phase === 'ready') onComplete();
  }, -2);
  // R3F captures its state before running frame subscribers. Render using the
  // current store so switching projection cannot draw a stale orthographic frame.
  useFrame(() => {
    const current = get();
    current.gl.render(current.scene, current.camera);
  }, 1);
  return null;
}

export function RevealRoom({
  onReady,
  intro,
  onError,
  children,
}: {
  onReady: () => void;
  intro: IntroState;
  onError: () => void;
  children: ReactNode;
}) {
  const root = useRef<THREE.Group>(null);
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!root.current || !intro.perspective) return;
    let cancelled = false;
    void prepareGpu(gl, root.current, intro.perspective, scene, () => cancelled)
      .then(() => {
        if (!cancelled) onReady();
      })
      .catch(() => {
        if (!cancelled) onError();
      });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, intro, onReady, onError]);
  useFrame(() => {
    if (root.current)
      root.current.visible =
        intro.phase === 'reveal' || intro.phase === 'ready';
  }, 0);
  return (
    <group ref={root} visible={false} name="Room_Reveal">
      {children}
    </group>
  );
}
