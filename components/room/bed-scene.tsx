'use client';

/* eslint-disable react/react-compiler -- Three.js scene objects are intentionally mutated through imperative APIs. */

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { roomPerformance } from './performance';
import { BakedPillowPlayback } from './physics/pillow/baked-playback';
import { placePillow } from './pillow-placement';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three/addons/controls/OrbitControls.js';
import { useRoomModel, useRoomBinding } from './room-assets';
import { createBedCollisionProxies } from './collision-proxies';
import { BedSurface } from './physics/collision/bed-surface';
import { DuvetPhysics } from './physics/duvet/duvet-physics';
import { getBakedDuvetClip } from './physics/duvet/baked-clips';
import type { DuvetBinding } from './physics/duvet/types';

import {
  DEFAULT_FABRIC_MATERIAL_SETTINGS,
  cloneFabricTexture,
} from '@/lib/fabric-material';
import { calculateUvDensityRepeat } from '@/lib/uv-density.mjs';

import {
  BED_CENTER_Z,
  BED_FLOOR_Y,
  DEFAULT_PILLOW_PALETTE,
  DUVET_ASSETS,
  PAD_MODEL_PATHS,
  FABRIC_DATA_TEXTURE_PATHS,
  PILLOW_FABRIC_PATCH_SIZE,
  PILLOW_MODEL_PATHS,
  PILLOW_CENTER_OFFSETS_Z,
  WEST_WALL_INNER_X,
  type BedSize,
  type BeddingPalette,
} from './config';
import { useDeferredFabricColorMaps } from './fabric-colors';
import { enableStochasticFabricColor } from './materials';

export function BedScene({
  bedSize,
  modelPath,
  palette,
  bulkPaletteRevision = 0,
  showColliders,
  onReady,
}: {
  bedSize: BedSize;
  modelPath: string;
  palette: BeddingPalette;
  bulkPaletteRevision?: number;
  showColliders: boolean;
  onReady: () => void;
}) {
  const gltf = useRoomModel(modelPath);
  const padGltf = useRoomModel(PAD_MODEL_PATHS[bedSize]);
  const pad = useMemo(() => padGltf.scene.clone(true), [padGltf.scene]);
  const duvetAsset = DUVET_ASSETS[bedSize];
  const duvetGltf = useRoomModel(duvetAsset.model);
  const bindingText = useRoomBinding(duvetAsset.binding);
  const duvetBinding = useMemo(
    () => JSON.parse(bindingText as string) as DuvetBinding,
    [bindingText],
  );
  const duvet = useMemo(() => {
    const source = duvetGltf.scene.getObjectByName(duvetAsset.renderMesh);
    if (!(source instanceof THREE.Mesh))
      throw new Error(
        `${duvetAsset.renderMesh} missing from ${duvetAsset.model}`,
      );
    const mesh = source.clone();
    mesh.geometry = source.geometry.clone();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }, [duvetGltf.scene, duvetAsset]);
  const duvetPhysics = useRef<DuvetPhysics | null>(null);
  const previousPalette = useRef(palette);
  const previousBulkRevision = useRef(bulkPaletteRevision);
  const pillowPhysics = useRef<BakedPillowPlayback | null>(null);
  const pillowPoses = useRef(
    [0, 1].map(() => ({
      base: new THREE.Vector3(),
      pivot: new THREE.Vector3(),
    })),
  );
  const pillowRotation = useMemo(() => new THREE.Quaternion(), []);
  const colliderDebug = useMemo(() => new THREE.Group(), []);
  const pillowGltf = useRoomModel(PILLOW_MODEL_PATHS[bedSize]);
  const dataSourceTextures = useLoader(THREE.TextureLoader, [
    ...FABRIC_DATA_TEXTURE_PATHS,
  ]);
  const { camera, gl, size: viewportSize } = useThree();
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const { pillows, pillowMeshes, pillowReferenceMeshes } = useMemo(() => {
    const models = [pillowGltf.scene.clone(true), pillowGltf.scene.clone(true)];
    const meshes: THREE.Mesh[] = [];
    const referenceMeshes: THREE.Mesh[] = [];

    models.forEach((pillow, index) => {
      pillow.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry = object.geometry.clone();
        if (!object.geometry.attributes.uv1 && object.geometry.attributes.uv) {
          object.geometry.setAttribute('uv1', object.geometry.attributes.uv);
        }
        meshes.push(object);
        if (index === 0) referenceMeshes.push(object);
      });
    });

    return {
      pillows: models,
      pillowMeshes: meshes,
      pillowReferenceMeshes: referenceMeshes,
    };
  }, [pillowGltf.scene]);
  const pillowTextureRepeat = useMemo(
    () =>
      calculateUvDensityRepeat(
        pillows[0],
        pillowReferenceMeshes,
        PILLOW_FABRIC_PATCH_SIZE,
      ),
    [pillowReferenceMeshes, pillows],
  );
  const pillowColorMaps = useDeferredFabricColorMaps(
    pillowTextureRepeat,
    palette,
  );
  const pillowDataTextures = useMemo(
    () =>
      dataSourceTextures.map((source) =>
        cloneFabricTexture(source, pillowTextureRepeat, THREE.NoColorSpace),
      ),
    [dataSourceTextures, pillowTextureRepeat],
  );
  const pillowMaterial = useMemo(() => {
    const [roughnessMap, normalMap, , aoMap] = pillowDataTextures;
    const material = new THREE.MeshPhysicalMaterial({
      map: pillowColorMaps[DEFAULT_PILLOW_PALETTE],
      roughness: DEFAULT_FABRIC_MATERIAL_SETTINGS.roughness,
      roughnessMap,
      normalMap,
      aoMap,
      clearcoat: DEFAULT_FABRIC_MATERIAL_SETTINGS.clearcoat,
      clearcoatRoughness: 0.22,
      normalScale: new THREE.Vector2(
        DEFAULT_FABRIC_MATERIAL_SETTINGS.normalScale,
        DEFAULT_FABRIC_MATERIAL_SETTINGS.normalScale,
      ),
      envMapIntensity: DEFAULT_FABRIC_MATERIAL_SETTINGS.envIntensity,
    });
    enableStochasticFabricColor(material);
    return material;
  }, [pillowColorMaps, pillowDataTextures]);
  const pillowMaterials = useMemo(
    () => [pillowMaterial.clone(), pillowMaterial.clone()],
    [pillowMaterial],
  );
  useEffect(
    () => () => pillowMaterials.forEach((material) => material.dispose()),
    [pillowMaterials],
  );
  // Match the pillow's physical fabric scale, not its raw UV repeat count.
  const duvetTextureRepeat = useMemo(() => {
    const source = duvetGltf.scene.getObjectByName(
      duvetAsset.renderMesh,
    ) as THREE.Mesh;
    return calculateUvDensityRepeat(
      duvetGltf.scene,
      [source],
      PILLOW_FABRIC_PATCH_SIZE,
    );
  }, [duvetGltf.scene, duvetAsset]);
  const duvetColorMaps = useDeferredFabricColorMaps(
    duvetTextureRepeat,
    palette,
  );
  const duvetDataTextures = useMemo(
    () =>
      dataSourceTextures.map((source) =>
        cloneFabricTexture(source, duvetTextureRepeat, THREE.NoColorSpace),
      ),
    [dataSourceTextures, duvetTextureRepeat],
  );
  const duvetMaterial = useMemo(() => {
    const material = pillowMaterial.clone();
    material.name = 'Duvet_Pillow_Fabric';
    material.map = duvetColorMaps[DEFAULT_PILLOW_PALETTE];
    [material.roughnessMap, material.normalMap, , material.aoMap] =
      duvetDataTextures;
    enableStochasticFabricColor(material);
    return material;
  }, [pillowMaterial, duvetColorMaps, duvetDataTextures]);
  useLayoutEffect(() => {
    duvet.material = duvetMaterial;
    duvetMaterial.map =
      duvetColorMaps[
        palette.duvet === 'none' ? DEFAULT_PILLOW_PALETTE : palette.duvet
      ];
  }, [duvet, duvetMaterial, duvetColorMaps, palette]);
  useEffect(() => () => duvetMaterial.dispose(), [duvetMaterial]);
  useEffect(
    () => () => {
      [...Object.values(duvetColorMaps), ...duvetDataTextures].forEach(
        (texture) => texture.dispose(),
      );
    },
    [duvetColorMaps, duvetDataTextures],
  );
  const padTextureRepeat = useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    padGltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    return calculateUvDensityRepeat(
      padGltf.scene,
      meshes,
      PILLOW_FABRIC_PATCH_SIZE,
    );
  }, [padGltf.scene]);
  const padColorMaps = useDeferredFabricColorMaps(padTextureRepeat, palette);
  const padDataTextures = useMemo(
    () =>
      dataSourceTextures.map((source) =>
        cloneFabricTexture(source, padTextureRepeat, THREE.NoColorSpace),
      ),
    [dataSourceTextures, padTextureRepeat],
  );
  const padMaterial = useMemo(() => {
    const material = pillowMaterial.clone();
    material.name = 'Pad_Pillow_Fabric';
    material.map = padColorMaps[DEFAULT_PILLOW_PALETTE];
    [material.roughnessMap, material.normalMap, , material.aoMap] =
      padDataTextures;
    enableStochasticFabricColor(material);
    return material;
  }, [pillowMaterial, padColorMaps, padDataTextures]);
  useLayoutEffect(() => {
    pad.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.material = padMaterial;
      object.castShadow = true;
      object.receiveShadow = true;
    });
    padMaterial.map =
      padColorMaps[
        palette.pad === 'none' ? DEFAULT_PILLOW_PALETTE : palette.pad
      ];
  }, [pad, padMaterial, padColorMaps, palette]);
  useEffect(() => () => padMaterial.dispose(), [padMaterial]);
  useEffect(
    () => () => {
      [...Object.values(padColorMaps), ...padDataTextures].forEach((texture) =>
        texture.dispose(),
      );
    },
    [padColorMaps, padDataTextures],
  );
  const controls = useMemo(
    () => new OrbitControlsImpl(camera, gl.domElement),
    [camera, gl],
  );
  const cameraInitialized = useRef(false);

  useLayoutEffect(() => {
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.minPolarAngle = 0.01;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    return () => controls.dispose();
  }, [controls]);

  useLayoutEffect(() => {
    // Complete authored-transform correction and cloth initialization before rendering.
    const materialAssignments: Array<{
      mesh: THREE.Mesh;
      original: THREE.Material | THREE.Material[];
      clones: THREE.Material[];
    }> = [];

    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    const authoredBounds = new THREE.Box3().setFromObject(model);
    const authoredCenter = authoredBounds.getCenter(new THREE.Vector3());
    const bedOffset = new THREE.Vector3(
      WEST_WALL_INNER_X - authoredBounds.min.x,
      BED_FLOOR_Y - authoredBounds.min.y,
      BED_CENTER_Z - authoredCenter.z,
    );
    model.position.copy(bedOffset);
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const original = object.material;
      const sourceMaterials = Array.isArray(original) ? original : [original];
      const clonedMaterials = sourceMaterials.map((sourceMaterial) => {
        const material = sourceMaterial.clone();
        return material;
      });

      object.material = Array.isArray(original)
        ? clonedMaterials
        : clonedMaterials[0];
      object.castShadow = true;
      object.receiveShadow = true;
      materialAssignments.push({
        mesh: object,
        original,
        clones: clonedMaterials,
      });
    });
    model.updateMatrixWorld(true);

    const supportBounds = new THREE.Box3();
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !/mattress/i.test(object.name))
        return;
      object.geometry.computeBoundingBox();
      if (object.geometry.boundingBox)
        supportBounds.union(
          object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld),
        );
    });
    if (supportBounds.isEmpty())
      throw new Error('Mattress required for pad placement');
    pad.position.set(0, 0, 0);
    pad.updateMatrixWorld(true);
    const padBounds = new THREE.Box3().setFromObject(pad, true);
    const padCenter = padBounds.getCenter(new THREE.Vector3());
    const supportCenter = supportBounds.getCenter(new THREE.Vector3());
    pad.position.set(
      supportCenter.x - padCenter.x,
      supportBounds.max.y - padBounds.min.y - 0.01,
      supportCenter.z - padCenter.z,
    );
    pad.updateMatrixWorld(true);

    // Resolve the final placement first; all dependents use these world bounds.
    const placedPadBounds = new THREE.Box3().setFromObject(pad, true);
    const placedPadCenter = placedPadBounds.getCenter(new THREE.Vector3());
    const beddingOffset = new THREE.Vector3(
      placedPadCenter.x - supportCenter.x,
      placedPadBounds.max.y - supportBounds.max.y,
      placedPadCenter.z - supportCenter.z,
    );

    pillows.forEach((pillow, index) => {
      const targetZ =
        supportCenter.z +
        (index === 0 ? 1 : -1) * PILLOW_CENTER_OFFSETS_Z[bedSize];
      placePillow(pillow, supportBounds, placedPadBounds, targetZ);
      pillow.name = `Pillow_${index + 1}`;
      pillowPoses.current[index].base.copy(pillow.position);
      pillow.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = pillowMaterials[index];
        object.castShadow = true;
        object.receiveShadow = true;
      });
      pillow.updateMatrixWorld(true);
      new THREE.Box3()
        .setFromObject(pillow)
        .getCenter(pillowPoses.current[index].pivot);
    });

    const collisionProxies = createBedCollisionProxies(
      model,
      pillows,
      bedSize,
      placedPadBounds,
    );
    pillowPhysics.current = new BakedPillowPlayback();
    const surface = new BedSurface([collisionProxies.root]);
    const colliderLines = surface.solids.map((surface) =>
      surface.createWireframe(),
    );
    const mattressBounds = new THREE.Box3();
    model.traverse((object) => {
      if (object instanceof THREE.Mesh && /mattress/i.test(object.name)) {
        mattressBounds.union(new THREE.Box3().setFromObject(object));
      }
    });
    if (mattressBounds.isEmpty())
      throw new Error('Mattress mesh required for duvet placement');
    const mattressCenter = mattressBounds.getCenter(new THREE.Vector3());
    const minRenderY = Math.min(
      ...duvetBinding.renderPositions.map((p) => p[1]),
    );
    const dubetPosOffset = new THREE.Vector3(
      mattressCenter.x + beddingOffset.x + 0.16,
      placedPadBounds.max.y + 0.12 - minRenderY,
      mattressCenter.z + beddingOffset.z,
    );
    // Restore immutable GLB coordinates before rebuilding the rest mapping.
    duvet.geometry.copy(
      (duvetGltf.scene.getObjectByName(duvetAsset.renderMesh) as THREE.Mesh)
        .geometry,
    );
    if (duvet.geometry.attributes.uv && !duvet.geometry.attributes.uv1) {
      duvet.geometry.setAttribute('uv1', duvet.geometry.attributes.uv);
    }
    duvetPhysics.current = new DuvetPhysics(
      duvet,
      duvetBinding,
      surface,
      dubetPosOffset,
      getBakedDuvetClip(bedSize),
    );
    roomPerformance.beginSimulation();
    colliderLines.push(duvetPhysics.current.createWireframe());
    colliderDebug.add(...colliderLines);

    const bedBounds = new THREE.Box3().setFromObject(model);
    const bedCenter = bedBounds.getCenter(new THREE.Vector3());

    if (!cameraInitialized.current) {
      const size = bedBounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z, 1);
      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 38;
      const viewportAspect = Math.max(
        viewportSize.width / viewportSize.height,
        0.35,
      );
      const portraitFit = Math.min(viewportAspect, 1);
      const fitDistance =
        (maxDimension * 0.5) /
        Math.tan(THREE.MathUtils.degToRad(fov * 0.5)) /
        portraitFit;
      const viewDirection = new THREE.Vector3(1, 0.62, 1.15).normalize();

      camera.position
        .copy(bedCenter)
        .add(viewDirection.multiplyScalar(fitDistance * 1.35));
      camera.near = Math.max(maxDimension / 100, 0.01);
      camera.far = maxDimension * 100;
      camera.lookAt(bedCenter);
      camera.updateProjectionMatrix();
      controls.minDistance = fitDistance * 0.5;
      controls.maxDistance = fitDistance * 3;
      cameraInitialized.current = true;
    }
    controls.target.copy(bedCenter);
    controls.update();
    onReady();

    return () => {
      duvetPhysics.current = null;
      pillowPhysics.current = null;
      colliderLines.forEach((lines) => {
        colliderDebug.remove(lines);
        lines.geometry.dispose();
        lines.material.dispose();
      });
      collisionProxies.dispose();
      materialAssignments.forEach(({ mesh, original, clones }) => {
        mesh.material = original;
        clones.forEach((material) => material.dispose());
      });
    };
  }, [
    bedSize,
    pad,
    colliderDebug,
    duvet,
    duvetBinding,
    duvetGltf.scene,
    duvetAsset,
    camera,
    controls,
    model,
    onReady,
    pillowMaterials,
    pillows,
    viewportSize.height,
    viewportSize.width,
  ]);

  useEffect(
    () => () => {
      pillowMaterial.dispose();
      pillowMeshes.forEach((mesh) => mesh.geometry.dispose());
    },
    [pillowMaterial, pillowMeshes],
  );

  useLayoutEffect(() => {
    const parts = ['pillow1', 'pillow2'] as const;
    const bulkChange = previousBulkRevision.current !== bulkPaletteRevision;
    previousBulkRevision.current = bulkPaletteRevision;
    parts.forEach((part, index) => {
      const color = palette[part];
      const material = pillowMaterials[index];
      const map = color === 'none' ? null : pillowColorMaps[color];
      if (Boolean(material.map) !== Boolean(map)) material.needsUpdate = true;
      material.map = map;
      material.color.set(0xffffff);
    });
    if (bulkChange) {
      previousPalette.current = palette;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      duvetPhysics.current?.reset(true);
      roomPerformance.beginSimulation();
      const timers = parts.map((_, index) =>
        window.setTimeout(
          () => {
            // Keep the bulk-change duvet clip running while the pillows play.
            pillowPhysics.current?.play(index);
            roomPerformance.beginSimulation();
          },
          (index + 1) * 300,
        ),
      );
      return () => timers.forEach(window.clearTimeout);
    }
    parts.forEach((part, index) => {
      if (previousPalette.current[part] !== palette[part]) {
        duvetPhysics.current?.useLiveSimulation();
        pillowPhysics.current?.play(index);
        roomPerformance.beginSimulation();
      }
    });
    if (previousPalette.current.duvet !== palette.duvet) {
      duvetPhysics.current?.reset(true);
      roomPerformance.beginSimulation();
    } else if (previousPalette.current.pad !== palette.pad) {
      duvetPhysics.current?.applyFootCenterImpulse();
      roomPerformance.beginSimulation();
    }
    previousPalette.current = palette;
  }, [pillowColorMaps, pillowMaterials, palette, bulkPaletteRevision, bedSize]);

  useEffect(
    () => () => {
      Object.values(pillowColorMaps).forEach((texture) => texture.dispose());
      pillowDataTextures.forEach((texture) => texture.dispose());
    },
    [pillowColorMaps, pillowDataTextures],
  );

  useEffect(() => () => duvet.geometry.dispose(), [duvet]);
  const performanceSample = useRef({ frames: 0, wall: 0, physics: 0, cpu: 0 });
  useFrame((_, delta) => {
    controls.update();
    const started = performance.now();
    pillowPhysics.current?.step(delta);
    const pillowMs = performance.now() - started;
    pillows.forEach((pillow, index) => {
      const lift = pillowPhysics.current?.displacement(index) ?? 0;
      const pose = pillowPoses.current[index];
      const rotation = pillowPhysics.current?.rotation(index);
      if (rotation)
        pillowRotation.set(rotation.x, rotation.y, rotation.z, rotation.w);
      else pillowRotation.identity();
      pillow.quaternion.copy(pillowRotation);
      pillow.position
        .copy(pose.base)
        .sub(pose.pivot)
        .applyQuaternion(pillowRotation)
        .add(pose.pivot);
      pillow.position.y += lift;
      const name = `Pillow_${index + 1}_LowPoly_Collider`;
      const solid = duvetPhysics.current?.surface.solids.find(
        (entry) => entry.name === name,
      );
      if (solid) {
        solid.translation.y = lift;
        solid.pivot.copy(pose.pivot);
        solid.rotation.copy(pillowRotation);
      }
      const debug = colliderDebug.getObjectByName(`Collider_${name}`);
      if (debug && showColliders) {
        debug.quaternion.copy(pillowRotation);
        debug.position
          .copy(pose.pivot)
          .applyQuaternion(pillowRotation)
          .negate()
          .add(pose.pivot);
        debug.position.y += lift;
      }
    });
    const before = duvetPhysics.current?.elapsed ?? 0;
    if (duvetPhysics.current) {
      duvetPhysics.current.step(delta);
    }
    duvetPhysics.current?.syncDebugWireframe(showColliders);
    const physicsElapsed = (duvetPhysics.current?.elapsed ?? before) - before;
    const cpuMs = performance.now() - started;
    roomPerformance.recordFrame(
      `${bedSize}/${palette.pillow1}/${palette.pillow2}/${palette.duvet}/pad=${palette.pad}/colliders=${showColliders}/physicsHz=60/duvetMode=${duvetPhysics.current?.mode}`,
      delta,
      physicsElapsed,
      cpuMs,
      duvetPhysics.current?.finished ?? false,
      pillowMs,
      duvetPhysics.current?.timings,
    );
    const sample = performanceSample.current;
    sample.frames += 1;
    sample.wall += delta;
    sample.physics += physicsElapsed;
    sample.cpu += cpuMs;
    if (sample.wall >= 0.5) {
      roomPerformance.publish({
        fps: sample.frames / sample.wall,
        frameSeconds: sample.wall / sample.frames,
        physicsSeconds: sample.physics / sample.frames,
        physicsMs: sample.cpu / sample.frames,
      });
      performanceSample.current = { frames: 0, wall: 0, physics: 0, cpu: 0 };
    }
  });

  return (
    <group name="Bedroom_Furniture">
      <primitive object={colliderDebug} visible={showColliders} />
      <primitive object={model} />
      <primitive object={duvet} visible={palette.duvet !== 'none'} />
      <primitive object={pad} visible={palette.pad !== 'none'} />
      <primitive object={pillows[0]} />
      <primitive object={pillows[1]} />
    </group>
  );
}
