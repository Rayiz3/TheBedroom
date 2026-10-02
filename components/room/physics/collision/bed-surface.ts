import * as THREE from 'three';
import { MeshContactSurface } from './mesh-contact-surface';

// Headboards are excluded from both the release height and collision surfaces.
export class BedSurface {
  // Independent mattress, lower frame and pillow surfaces; no headboard contact.
  solids: MeshContactSurface[] = [];
  private contactNormal = new THREE.Vector3();
  bounds = new THREE.Box3();
  cell = 0.018;
  width: number;
  depth: number;
  heights: Float32Array;
  constructor(objects: THREE.Object3D[]) {
    objects.forEach((o) => {
      o.updateMatrixWorld(true);
      this.bounds.union(new THREE.Box3().setFromObject(o));
    });
    this.width =
      Math.ceil((this.bounds.max.x - this.bounds.min.x) / this.cell) + 1;
    this.depth =
      Math.ceil((this.bounds.max.z - this.bounds.min.z) / this.cell) + 1;
    this.heights = new Float32Array(this.width * this.depth).fill(-Infinity);
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    objects.forEach((root) =>
      root.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        if (/head/i.test(o.name)) return;
        this.solids.push(new MeshContactSurface(o));
        const p = o.geometry.getAttribute('position'),
          index = o.geometry.index;
        for (let k = 0; k < (index?.count ?? p.count); k += 3) {
          a.fromBufferAttribute(p, index ? index.getX(k) : k).applyMatrix4(
            o.matrixWorld,
          );
          b.fromBufferAttribute(
            p,
            index ? index.getX(k + 1) : k + 1,
          ).applyMatrix4(o.matrixWorld);
          c.fromBufferAttribute(
            p,
            index ? index.getX(k + 2) : k + 2,
          ).applyMatrix4(o.matrixWorld);
          const den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
          if (Math.abs(den) < 1e-12) continue;
          const x0 = Math.max(
            0,
            Math.floor(
              (Math.min(a.x, b.x, c.x) - this.bounds.min.x) / this.cell,
            ),
          );
          const x1 = Math.min(
            this.width - 1,
            Math.ceil(
              (Math.max(a.x, b.x, c.x) - this.bounds.min.x) / this.cell,
            ),
          );
          const z0 = Math.max(
            0,
            Math.floor(
              (Math.min(a.z, b.z, c.z) - this.bounds.min.z) / this.cell,
            ),
          );
          const z1 = Math.min(
            this.depth - 1,
            Math.ceil(
              (Math.max(a.z, b.z, c.z) - this.bounds.min.z) / this.cell,
            ),
          );
          for (let z = z0; z <= z1; z++)
            for (let x = x0; x <= x1; x++) {
              const wx = this.bounds.min.x + x * this.cell,
                wz = this.bounds.min.z + z * this.cell;
              const u =
                ((b.z - c.z) * (wx - c.x) + (c.x - b.x) * (wz - c.z)) / den;
              const v =
                ((c.z - a.z) * (wx - c.x) + (a.x - c.x) * (wz - c.z)) / den;
              if (u >= -1e-5 && v >= -1e-5 && u + v <= 1.00001) {
                const at = z * this.width + x;
                this.heights[at] = Math.max(
                  this.heights[at],
                  u * a.y + v * b.y + (1 - u - v) * c.y,
                );
              }
            }
        }
      }),
    );
  }
  height(x: number, z: number) {
    const ix = Math.round((x - this.bounds.min.x) / this.cell),
      iz = Math.round((z - this.bounds.min.z) / this.cell);
    if (ix < 0 || iz < 0 || ix >= this.width || iz >= this.depth)
      return -Infinity;
    return this.heights[iz * this.width + ix];
  }
  distance(
    p: THREE.Vector3,
    s: (typeof this.solids)[number],
    normal: THREE.Vector3,
  ) {
    return s.distance(p, normal);
  }
  project(p: THREE.Vector3, old: THREE.Vector3, radius: number) {
    for (const s of this.solids) {
      const n = this.contactNormal,
        d = s.distance(p, n, radius);
      if (d >= radius) continue;
      p.addScaledVector(n, radius - d);
      const vx = p.x - old.x,
        vy = p.y - old.y,
        vz = p.z - old.z,
        vn = vx * n.x + vy * n.y + vz * n.z;
      // Remove normal impact velocity; retain tangential sliding with mild friction.
      old.set(
        p.x - (vx - vn * n.x) * 0.54,
        p.y - (vy - vn * n.y) * 0.54,
        p.z - (vz - vn * n.z) * 0.54,
      );
    }
    if (p.y < radius) {
      p.y = radius;
      old.y = radius;
    }
  }
}
