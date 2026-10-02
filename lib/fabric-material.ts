import * as THREE from 'three';

export type FabricMaterialSettings = {
  envIntensity: number;
  roughness: number;
  clearcoat: number;
  normalScale: number;
  displacement: number;
};

export const DEFAULT_FABRIC_MATERIAL_SETTINGS: FabricMaterialSettings = {
  envIntensity: 1.5,
  roughness: 1,
  clearcoat: 0,
  normalScale: 1,
  displacement: 0,
};

export function cloneFabricTexture(
  source: THREE.Texture,
  repeat: number | readonly [number, number],
  colorSpace: THREE.ColorSpace,
) {
  const [repeatU, repeatV] =
    typeof repeat === 'number' ? [repeat, repeat] : repeat;
  const texture = source.clone();
  texture.colorSpace = colorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatU, repeatV);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function cloneFabricTextures(
  textures: THREE.Texture[],
  repeat: number | readonly [number, number],
) {
  return textures.map((source, index) =>
    cloneFabricTexture(
      source,
      repeat,
      index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace,
    ),
  );
}

export function createFabricMaterial(
  textures: THREE.Texture[],
  settings: FabricMaterialSettings,
) {
  const [map, roughnessMap, normalMap, displacementMap, aoMap] = textures;

  return new THREE.MeshPhysicalMaterial({
    map,
    roughness: settings.roughness,
    roughnessMap,
    normalMap,
    displacementMap,
    aoMap,
    clearcoat: settings.clearcoat,
    clearcoatRoughness: 0.22,
    normalScale: new THREE.Vector2(settings.normalScale, settings.normalScale),
    displacementScale: settings.displacement,
    envMapIntensity: settings.envIntensity,
  });
}
