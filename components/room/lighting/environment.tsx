'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { INTRO_ROOM_HDRI_MULTIPLIER, type IntroState } from '../intro-state';

import {
  ROOM_BACKGROUND_PATH,
  ROOM_HDRI_OPTIONS,
  type RoomHdri,
} from '../config';

export function RoomEnvironment({
  source,
  intensity,
  onReady,
  intro,
}: {
  source: RoomHdri;
  intensity: number;
  onReady: () => void;
  intro?: IntroState;
}) {
  // Preload both maps so changing environments does not suspend the room.
  const environments = useLoader(
    EXRLoader,
    ROOM_HDRI_OPTIONS.map((option) => option.path),
  );
  const hdri =
    environments[ROOM_HDRI_OPTIONS.findIndex((option) => option.id === source)];
  const background = useLoader(THREE.TextureLoader, ROOM_BACKGROUND_PATH);
  const { scene, get } = useThree();
  const backdrop = useRef<THREE.Mesh>(null);
  const backdropMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          image: { value: background },
          orientation: { value: new THREE.Matrix3() },
          aspect: { value: 1 },
          halfFov: { value: Math.tan(THREE.MathUtils.degToRad(38 / 2)) },
        },
        vertexShader: `varying vec2 screenUv;
      void main() { screenUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
        fragmentShader: `uniform sampler2D image;
      uniform mat3 orientation;
      uniform float aspect;
      uniform float halfFov;
      varying vec2 screenUv;
      void main() {
        vec2 p = screenUv * 2.0 - 1.0;
        vec3 direction = normalize(orientation * vec3(p.x * aspect * halfFov, p.y * halfFov, -1.0));
        vec2 imageUv = vec2(atan(direction.z, direction.x) / 6.28318530718 + 0.5, asin(clamp(direction.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
        gl_FragColor = texture2D(image, imageUv);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
        depthTest: false,
        depthWrite: false,
      }),
    [background],
  );
  useLayoutEffect(() => () => backdropMaterial.dispose(), [backdropMaterial]);

  useLayoutEffect(() => {
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    background.colorSpace = THREE.SRGBColorSpace;
    background.mapping = THREE.EquirectangularReflectionMapping;
    background.needsUpdate = true;
    const enabled = intensity > 0;
    scene.environment = enabled ? hdri : null;
    scene.background = background;
    scene.environmentIntensity = intensity;
    scene.backgroundIntensity = 1;
    scene.backgroundBlurriness = 0;

    return () => {
      scene.environment = null;
      scene.background = null;
    };
  }, [background, hdri, intensity, scene]);

  useLayoutEffect(() => onReady(), [background, hdri, onReady]);
  useFrame(({ size }) => {
    const camera = get().camera;
    const orthographic = camera instanceof THREE.OrthographicCamera;
    scene.background = orthographic ? null : background;
    if (backdrop.current) backdrop.current.visible = orthographic;
    if (orthographic) {
      camera.updateMatrixWorld();
      backdropMaterial.uniforms.orientation.value.setFromMatrix4(
        camera.matrixWorld,
      );
      backdropMaterial.uniforms.aspect.value = size.width / size.height;
      backdropMaterial.uniforms.halfFov.value = Math.tan(
        THREE.MathUtils.degToRad((intro?.perspective?.fov ?? 38) / 2),
      );
    }
    if (!intro) return;
    const multiplier =
      intro.phase === 'room'
        ? INTRO_ROOM_HDRI_MULTIPLIER
        : intro.phase === 'reveal'
          ? THREE.MathUtils.lerp(INTRO_ROOM_HDRI_MULTIPLIER, 1, intro.progress)
          : 1;
    scene.environmentIntensity = intensity * multiplier;
  }, -1);
  return (
    <mesh
      ref={backdrop}
      frustumCulled={false}
      renderOrder={-1000}
      visible={false}
      material={backdropMaterial}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
