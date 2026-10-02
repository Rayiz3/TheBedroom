import * as THREE from 'three';
import type { DuvetBinding } from './types';
import { createVertexMapping } from './vertex-mapping';
import { DUVET_BINDING_NORMAL_SETTINGS } from './settings';
import { ThicknessNormals } from './thickness-normals';
export class DuvetMeshBinding {
  readonly normals: THREE.Vector3[];
  readonly frames: {
    a: THREE.Vector3;
    b: THREE.Vector3;
    c: THREE.Vector3;
    t: THREE.Vector3;
  }[];
  readonly canonical: Float32Array;
  readonly edge = new THREE.Vector3();
  readonly faceNormal = new THREE.Vector3();
  readonly renderPoint = new THREE.Vector3();
  readonly renderNormal = new THREE.Vector3();
  readonly renderTangent = new THREE.Vector3();
  readonly renderBitangent = new THREE.Vector3();
  readonly thicknessDirection = new THREE.Vector3();
  readonly thicknessNormals: ThicknessNormals;

  readonly mapping: number[];
  constructor(
    public mesh: THREE.Mesh,
    public data: DuvetBinding,
    public positions: THREE.Vector3[],
    public timings: { meshMs: number; normalsMs: number },
  ) {
    this.normals = this.positions.map(() => new THREE.Vector3());
    this.thicknessNormals = new ThicknessNormals(
      this.positions.length,
      data.proxyTriangles,
    );
    this.frames = data.proxyTriangles.map(([a, b, c]) => ({
      a: this.positions[a],
      b: this.positions[b],
      c: this.positions[c],
      t: new THREE.Vector3(),
    }));
    this.canonical = new Float32Array(data.bindings.length * 3);

    this.mapping = createVertexMapping(mesh, data);
  }
  updateMesh() {
    const meshStarted = performance.now();
    const normals = this.normals;
    for (const normal of normals) normal.set(0, 0, 0);
    const edge = this.edge,
      faceNormal = this.faceNormal;
    this.data.proxyTriangles.forEach(([a, b, c]) => {
      faceNormal
        .subVectors(this.positions[b], this.positions[a])
        .cross(edge.subVectors(this.positions[c], this.positions[a]));
      normals[a].add(faceNormal);
      normals[b].add(faceNormal);
      normals[c].add(faceNormal);
    });
    normals.forEach((n) => n.normalize());
    const thicknessNormals = this.thicknessNormals.update(
      normals,
      DUVET_BINDING_NORMAL_SETTINGS.smoothingPasses,
      DUVET_BINDING_NORMAL_SETTINGS.smoothingStrength,
    );
    const frames = this.frames;
    // Only the triangle tangent is consumed by the binding interpolation.
    for (const frame of frames)
      frame.t.subVectors(frame.b, frame.a).normalize();
    const canonical = this.canonical,
      p = this.renderPoint;
    const n = this.renderNormal,
      t = this.renderTangent,
      bit = this.renderBitangent;
    this.data.bindings.forEach(([tri, w, o], i) => {
      const f = frames[tri];
      const [a, b, c] = this.data.proxyTriangles[tri];
      n.copy(normals[a])
        .multiplyScalar(w[0])
        .addScaledVector(normals[b], w[1])
        .addScaledVector(normals[c], w[2])
        .normalize();
      t.copy(f.t).addScaledVector(n, -f.t.dot(n)).normalize();
      bit.crossVectors(n, t);
      // Preserve the original tangent offsets; filter only the loft direction.
      const thickness = this.thicknessDirection
        .copy(thicknessNormals[a])
        .multiplyScalar(w[0])
        .addScaledVector(thicknessNormals[b], w[1])
        .addScaledVector(thicknessNormals[c], w[2]);
      if (thickness.lengthSq() < 1e-12) thickness.copy(n);
      else thickness.normalize();
      p.copy(f.a)
        .multiplyScalar(w[0])
        .addScaledVector(f.b, w[1])
        .addScaledVector(f.c, w[2])
        .addScaledVector(t, o[0])
        .addScaledVector(bit, o[1])
        .addScaledVector(thickness, o[2]);
      p.toArray(canonical, i * 3);
    });
    const attr = this.mesh.geometry.getAttribute('position');
    this.mapping.forEach((id, i) =>
      attr.setXYZ(
        i,
        canonical[id * 3],
        canonical[id * 3 + 1],
        canonical[id * 3 + 2],
      ),
    );
    attr.needsUpdate = true;
    const normalsStarted = performance.now();
    this.timings.meshMs = normalsStarted - meshStarted;
    this.mesh.geometry.computeVertexNormals();
    this.timings.normalsMs = performance.now() - normalsStarted;
  }
}
