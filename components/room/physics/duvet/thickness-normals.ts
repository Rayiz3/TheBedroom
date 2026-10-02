import * as THREE from 'three';

/** Spatial-only filter: deterministic on reset and independent of frame rate. */
export class ThicknessNormals {
  readonly normals: THREE.Vector3[];
  private readonly scratch: THREE.Vector3[];
  private readonly neighbors: number[][];

  constructor(count: number, triangles: number[][]) {
    this.normals = Array.from({ length: count }, () => new THREE.Vector3());
    this.scratch = this.normals.map(() => new THREE.Vector3());
    const rings = Array.from({ length: count }, () => new Set<number>());
    for (const [a, b, c] of triangles) {
      rings[a].add(b).add(c);
      rings[b].add(a).add(c);
      rings[c].add(a).add(b);
    }
    this.neighbors = rings.map((ring) => [...ring]);
  }

  update(source: THREE.Vector3[], passes: number, strength: number) {
    this.normals.forEach((n, i) => n.copy(source[i]));
    const weight = THREE.MathUtils.clamp(strength, 0, 1);
    for (let pass = 0; pass < passes; pass++) {
      this.normals.forEach((normal, i) => {
        const next = this.scratch[i].set(0, 0, 0);
        const ring = this.neighbors[i];
        for (const j of ring) next.add(this.normals[j]);
        if (next.lengthSq() < 1e-12) {
          next.copy(normal);
        } else {
          next
            .normalize()
            .multiplyScalar(weight)
            .addScaledVector(normal, 1 - weight);
          if (next.lengthSq() < 1e-12) next.copy(normal);
          else next.normalize();
        }
      });
      this.normals.forEach((n, i) => n.copy(this.scratch[i]));
    }
    return this.normals;
  }
}
