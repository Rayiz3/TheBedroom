import * as THREE from 'three';

/**
 * @param {{ value: number, weight: number }[]} samples
 */
function weightedMedian(samples) {
  const sorted = [...samples].sort((a, b) => a.value - b.value);
  const midpoint = sorted.reduce((sum, sample) => sum + sample.weight, 0) / 2;
  let accumulatedWeight = 0;

  for (const sample of sorted) {
    accumulatedWeight += sample.weight;
    if (accumulatedWeight >= midpoint) return sample.value;
  }

  return sorted.at(-1)?.value;
}

/**
 * Measures the authored UV density after the model's final transform and
 * returns texture repeat values that make one texture tile match the desired
 * rendered patch size. All valid triangles contribute; world-area weighting
 * keeps tiny bevels and UV fragments from dominating the result.
 *
 * @param {THREE.Object3D} root
 * @param {THREE.Mesh[]} meshes
 * @param {number | readonly [number, number]} patchSize
 * @returns {[number, number]}
 */
export function calculateUvDensityRepeat(root, meshes, patchSize) {
  const [patchWidth, patchLength] = typeof patchSize === 'number' ? [patchSize, patchSize] : patchSize;
  if (!(patchWidth > 0) || !(patchLength > 0)) {
    throw new RangeError('Rendered patch dimensions must be positive numbers.');
  }

  root.updateMatrixWorld(true);

  /** @type {{ value: number, weight: number }[]} */
  const uDensitySamples = [];
  /** @type {{ value: number, weight: number }[]} */
  const vDensitySamples = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const edgeAB = new THREE.Vector3();
  const edgeAC = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const dPositionDu = new THREE.Vector3();
  const dPositionDv = new THREE.Vector3();

  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    if (!position || !uv) continue;

    const index = geometry.index;
    const vertexCount = index ? index.count : position.count;

    for (let triangle = 0; triangle < vertexCount; triangle += 3) {
      const indexA = index ? index.getX(triangle) : triangle;
      const indexB = index ? index.getX(triangle + 1) : triangle + 1;
      const indexC = index ? index.getX(triangle + 2) : triangle + 2;

      a.fromBufferAttribute(position, indexA).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, indexB).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, indexC).applyMatrix4(mesh.matrixWorld);
      edgeAB.subVectors(b, a);
      edgeAC.subVectors(c, a);

      const triangleArea = cross.crossVectors(edgeAB, edgeAC).length() * 0.5;
      if (!(triangleArea > 1e-12)) continue;

      const duAB = uv.getX(indexB) - uv.getX(indexA);
      const dvAB = uv.getY(indexB) - uv.getY(indexA);
      const duAC = uv.getX(indexC) - uv.getX(indexA);
      const dvAC = uv.getY(indexC) - uv.getY(indexA);
      const determinant = duAB * dvAC - duAC * dvAB;
      if (Math.abs(determinant) <= 1e-12) continue;

      dPositionDu
        .copy(edgeAB)
        .multiplyScalar(dvAC)
        .addScaledVector(edgeAC, -dvAB)
        .divideScalar(determinant);
      dPositionDv
        .copy(edgeAC)
        .multiplyScalar(duAB)
        .addScaledVector(edgeAB, -duAC)
        .divideScalar(determinant);

      const worldUnitsPerU = dPositionDu.length();
      const worldUnitsPerV = dPositionDv.length();
      if (Number.isFinite(worldUnitsPerU) && worldUnitsPerU > 0) {
        uDensitySamples.push({ value: worldUnitsPerU, weight: triangleArea });
      }
      if (Number.isFinite(worldUnitsPerV) && worldUnitsPerV > 0) {
        vDensitySamples.push({ value: worldUnitsPerV, weight: triangleArea });
      }
    }
  }

  const worldUnitsPerU = weightedMedian(uDensitySamples);
  const worldUnitsPerV = weightedMedian(vDensitySamples);
  if (worldUnitsPerU === undefined || worldUnitsPerV === undefined) {
    throw new RangeError('The textile meshes do not contain enough valid UV data to calculate texture density.');
  }

  return [worldUnitsPerU / patchWidth, worldUnitsPerV / patchLength];
}
