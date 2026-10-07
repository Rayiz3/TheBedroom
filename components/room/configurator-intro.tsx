'use client';
/* eslint-disable react/react-compiler -- Intro animation mutates Three.js objects without per-frame React renders. */
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { advanceIntro, type IntroState } from './intro-state';

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
    );
    if (phase === 'reveal') {
      set({ camera: intro.perspective });
      onReveal();
    }
    if (phase === 'ready') onComplete();
  }, -2);
  return null;
}

export function RevealRoom({
  onReady,
  children,
}: {
  onReady: () => void;
  children: ReactNode;
}) {
  const presented = useRef(false);
  // Signal readiness only after the fully opaque room has rendered once.
  // IntroCamera runs at -2, so camera movement starts on the following frame.
  useFrame(() => {
    if (presented.current) return;
    presented.current = true;
    onReady();
  }, 0);
  return <group name="Room_Reveal">{children}</group>;
}
