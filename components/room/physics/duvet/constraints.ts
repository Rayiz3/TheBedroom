import * as THREE from 'three';
import type { DuvetBinding } from './types';
import { DUVET_DRAPE_SETTINGS } from './settings';

export function createDuvetConstraints(
  data: DuvetBinding,
  positions: THREE.Vector3[],
) {
  const neighbors: number[][] = positions.map(() => []);
  data.stretchEdges.forEach(([a, b]) => {
    neighbors[a].push(b);
    neighbors[b].push(a);
  });
  const edgeUses = new Map<string, { a: number; b: number; count: number }>();
  for (const [a, b, c] of data.proxyTriangles) {
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      const key = `${Math.min(u, v)},${Math.max(u, v)}`;
      const edge = edgeUses.get(key);
      if (edge) edge.count += 1;
      else edgeUses.set(key, { a: u, b: v, count: 1 });
    }
  }
  const distances = positions.map(() => Infinity);
  const queue: number[] = [];
  for (const edge of edgeUses.values()) {
    if (edge.count !== 1) continue;
    for (const id of [edge.a, edge.b]) {
      if (distances[id] === 0) continue;
      distances[id] = 0;
      queue.push(id);
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    for (const neighbor of neighbors[id]) {
      if (distances[neighbor] !== Infinity) continue;
      distances[neighbor] = distances[id] + 1;
      queue.push(neighbor);
    }
  }
  const regularizationWeights = distances.map((distance) =>
    THREE.MathUtils.smoothstep(distance, 1, 5),
  );
  const constraints = data.stretchEdges.map(([a, b, length]) => ({
    a,
    b,
    length,
    compliance: 2e-7,
    lambda: 0,
  }));
  data.bendingHinges.forEach(({ opposite: [a, b] }) =>
    constraints.push({
      a,
      b,
      length: positions[a].distanceTo(positions[b]),
      compliance: DUVET_DRAPE_SETTINGS.bendingCompliance,
      lambda: 0,
    }),
  );

  return { neighbors, regularizationWeights, constraints };
}
