'use client';

/* eslint-disable react/react-compiler -- OrbitControls and camera are intentionally mutated. */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/addons/controls/OrbitControls.js';

export function CameraControls({
  autoRotate,
  resetKey,
}: {
  autoRotate: boolean;
  resetKey: number;
}) {
  const { camera, gl } = useThree();
  const controls = useMemo(
    () => new OrbitControlsImpl(camera, gl.domElement),
    [camera, gl],
  );

  useEffect(() => {
    controls.target.set(0, 0, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minDistance = 2;
    controls.maxDistance = 2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.rotateSpeed = 0.62;
    controls.autoRotateSpeed = 0.72;
    controls.update();

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.clamp(
          camera.fov + event.deltaY * 0.025,
          5,
          80,
        );
        camera.updateProjectionMatrix();
      }
    };
    gl.domElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      gl.domElement.removeEventListener('wheel', handleWheel);
      controls.dispose();
    };
  }, [camera, controls, gl]);

  useEffect(() => {
    camera.position.set(1.62, 0.72, 0.92).normalize().multiplyScalar(2);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 45;
      camera.updateProjectionMatrix();
    }
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
