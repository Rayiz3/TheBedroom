'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { useLoader } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { cloneFabricTextures } from '@/lib/fabric-material';
import { calculateUvDensityRepeat } from '@/lib/uv-density.mjs';

import {
  DUVET_CENTER_Z,
  DUVET_PATCH_RENDER_SIZE,
  DUVET_RENDER_WIDTH,
  LEGACY_DUVET_TEXTURE_REPEAT,
  MODEL_PATHS,
  PILLOW_CENTER_X,
  PILLOW_CENTER_Z,
  PILLOW_RENDER_SCALE,
  PILLOW_ROTATION_X,
  PILLOW_ROTATION_Y,
  type DuvetRepeatMode,
  type ViewerSettings,
} from './config';
import { createTextileMaterial } from './materials';

export function BedroomAssembly({
  settings,
  texturePaths,
  duvetRepeatMode,
  stochasticTiling,
  onDuvetRepeatCalculated,
  onReady,
}: {
  settings: ViewerSettings;
  texturePaths: string[];
  duvetRepeatMode: DuvetRepeatMode;
  stochasticTiling: boolean;
  onDuvetRepeatCalculated: (repeat: readonly [number, number]) => void;
  onReady: () => void;
}) {
  const sourceTextures = useLoader(THREE.TextureLoader, texturePaths);
  const [bedGltf, duvetGltf, pillowGltf] = useLoader(GLTFLoader, [
    ...MODEL_PATHS,
  ]);
  const {
    bed,
    duvet,
    pillows,
    duvetMeshes,
    pillowMeshes,
    duvetPhysicalRepeat,
    pillowPhysicalRepeat,
  } = useMemo(() => {
    const bedModel = bedGltf.scene.clone(true);
    const duvetModel = duvetGltf.scene.clone(true);
    const pillowLeft = pillowGltf.scene.clone(true);
    const pillowRight = pillowGltf.scene.clone(true);
    const duvetTextileMeshes: THREE.Mesh[] = [];
    const pillowLeftTextileMeshes: THREE.Mesh[] = [];
    const pillowRightTextileMeshes: THREE.Mesh[] = [];

    bedModel.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    for (const [model, target] of [
      [duvetModel, duvetTextileMeshes],
      [pillowLeft, pillowLeftTextileMeshes],
      [pillowRight, pillowRightTextileMeshes],
    ] as const) {
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry = object.geometry.clone();
        if (!object.geometry.attributes.uv1 && object.geometry.attributes.uv) {
          object.geometry.setAttribute('uv1', object.geometry.attributes.uv);
        }
        object.castShadow = true;
        object.receiveShadow = true;
        target.push(object);
      });
    }

    for (const pillow of [pillowLeft, pillowRight]) {
      pillow.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.position.set(0, 0, 0);
        object.quaternion.identity();
        object.scale.set(1, 1, 1);
      });
    }

    bedModel.scale.set(1.36, 1.2, 1.45);
    bedModel.position.set(0, 0, 0);
    bedModel.updateMatrixWorld(true);
    const bedSurfaceY = new THREE.Box3().setFromObject(bedModel).max.y;
    const duvetSourceSize = new THREE.Box3()
      .setFromObject(duvetModel)
      .getSize(new THREE.Vector3());
    duvetModel.scale.set(
      DUVET_RENDER_WIDTH / duvetSourceSize.x,
      0.79,
      1.15 / duvetSourceSize.z,
    );
    duvetModel.position.set(0, 0, 0);
    duvetModel.updateMatrixWorld(true);
    const duvetBounds = new THREE.Box3().setFromObject(duvetModel);
    const duvetCenter = duvetBounds.getCenter(new THREE.Vector3());
    duvetModel.position.set(
      -duvetCenter.x,
      -bedSurfaceY * 0.2,
      DUVET_CENTER_Z - duvetCenter.z,
    );
    const physicalRepeat = calculateUvDensityRepeat(
      duvetModel,
      duvetTextileMeshes,
      DUVET_PATCH_RENDER_SIZE,
    );

    for (const [pillow, x] of [
      [pillowLeft, -PILLOW_CENTER_X],
      [pillowRight, PILLOW_CENTER_X],
    ] as const) {
      pillow.scale.set(...PILLOW_RENDER_SCALE);
      pillow.rotation.set(PILLOW_ROTATION_X, PILLOW_ROTATION_Y, 0);
      pillow.position.set(0, 0, 0);
      pillow.updateMatrixWorld(true);
      const pillowBounds = new THREE.Box3().setFromObject(pillow);
      const pillowCenter = pillowBounds.getCenter(new THREE.Vector3());
      pillow.position.set(
        x - pillowCenter.x,
        0,
        PILLOW_CENTER_Z - pillowCenter.z,
      );
    }

    const pillowRepeat = calculateUvDensityRepeat(
      pillowLeft,
      pillowLeftTextileMeshes,
      DUVET_PATCH_RENDER_SIZE,
    );
    return {
      bed: bedModel,
      duvet: duvetModel,
      pillows: [pillowLeft, pillowRight],
      duvetMeshes: duvetTextileMeshes,
      pillowMeshes: [...pillowLeftTextileMeshes, ...pillowRightTextileMeshes],
      duvetPhysicalRepeat: physicalRepeat,
      pillowPhysicalRepeat: pillowRepeat,
    };
  }, [bedGltf.scene, duvetGltf.scene, pillowGltf.scene]);

  const duvetTextureRepeat =
    duvetRepeatMode === 'physical'
      ? duvetPhysicalRepeat
      : LEGACY_DUVET_TEXTURE_REPEAT;
  const duvetTextures = useMemo(
    () => cloneFabricTextures(sourceTextures, duvetTextureRepeat),
    [duvetTextureRepeat, sourceTextures],
  );
  const pillowTextures = useMemo(
    () => cloneFabricTextures(sourceTextures, pillowPhysicalRepeat),
    [pillowPhysicalRepeat, sourceTextures],
  );

  useEffect(() => {
    onDuvetRepeatCalculated(duvetPhysicalRepeat);
  }, [duvetPhysicalRepeat, onDuvetRepeatCalculated]);
  const pillowMaterial = useMemo(
    () =>
      createTextileMaterial(
        pillowTextures,
        settings,
        pillowPhysicalRepeat,
        stochasticTiling,
      ),
    [pillowPhysicalRepeat, pillowTextures, settings, stochasticTiling],
  );
  const duvetMaterial = useMemo(
    () =>
      createTextileMaterial(
        duvetTextures,
        settings,
        duvetTextureRepeat,
        stochasticTiling,
      ),
    [duvetTextureRepeat, duvetTextures, settings, stochasticTiling],
  );

  useEffect(() => {
    for (const mesh of pillowMeshes) mesh.material = pillowMaterial;
    for (const mesh of duvetMeshes) mesh.material = duvetMaterial;
    onReady();
  }, [duvetMaterial, duvetMeshes, onReady, pillowMaterial, pillowMeshes]);
  useEffect(
    () => () => {
      pillowMaterial.dispose();
      duvetMaterial.dispose();
    },
    [duvetMaterial, pillowMaterial],
  );
  useEffect(
    () => () => {
      for (const fabricTexture of [...pillowTextures, ...duvetTextures]) {
        fabricTexture.dispose();
      }
    },
    [duvetTextures, pillowTextures],
  );

  return (
    <group position={[0, 0, 0]}>
      <primitive object={bed} />
      <primitive object={duvet} />
      {pillows.map((pillow, index) => (
        <primitive key={index} object={pillow} />
      ))}
    </group>
  );
}
