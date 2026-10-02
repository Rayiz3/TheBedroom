import * as THREE from 'three';
import type { DuvetBinding } from './types';
export function createVertexMapping(mesh: THREE.Mesh, data: DuvetBinding) {
  const key = (x: number, y: number, z: number) =>
    `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
  const lookup = new Map(
    data.renderPositions.map((p, i) => [key(p[0], p[1], p[2]), i]),
  );
  const attr = mesh.geometry.getAttribute('position');
  const mapping = Array.from({ length: attr.count }, (_, i) => {
    const x = attr.getX(i),
      y = attr.getY(i),
      z = attr.getZ(i);
    let id = lookup.get(key(x, y, z));
    // GLB float32 export can cross a rounding-cell boundary by sub-microns.
    // Search adjacent cells within 10 micrometers, not arbitrary nearest vertices.
    if (id === undefined) {
      const cell = [x, y, z].map((value) => Math.round(value * 1e5));
      let bestDistanceSq = 1e-10;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const candidate = lookup.get(
              `${cell[0] + dx},${cell[1] + dy},${cell[2] + dz}`,
            );
            if (candidate === undefined) continue;
            const p = data.renderPositions[candidate];
            const distanceSq =
              (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2;
            if (distanceSq < bestDistanceSq) {
              bestDistanceSq = distanceSq;
              id = candidate;
            }
          }
        }
      }
    }
    if (id === undefined)
      throw new Error('Duvet GLB and binding JSON do not match.');
    return id;
  });

  return mapping;
}
