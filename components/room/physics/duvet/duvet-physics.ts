import * as THREE from 'three';
import { BakedClock } from '../baked-clock';
import { BedSurface } from '../collision/bed-surface';
import type { DuvetBinding } from './types';
import {
  DUVET_DRAPE_SETTINGS,
  DUVET_COLLISION_RADIUS,
  DUVET_PAD_IMPULSE_SETTINGS,
} from './settings';
import { createDuvetConstraints } from './constraints';
import { DuvetMeshBinding } from './mesh-binding';
import { clampFrameDelta } from '../utils/time-step';

export type DuvetClip = {
  fps: number;
  vertices: number;
  frames: number;
  positions: Float32Array;
};
export class DuvetPhysics {
  // Render every frame; interpolate a one-second recording over two seconds.
  readonly playbackRate = 0.5;
  private get playbackDuration() {
    return (this.clip!.frames - 1) / this.clip!.fps / this.playbackRate;
  }
  private playback = false;
  private readonly bakedClock = new BakedClock();
  private readonly playbackOrigin: THREE.Vector3;
  get mode() {
    return this.playback ? 'baked' : 'live';
  }
  useLiveSimulation() {
    if (!this.playback) return;
    this.playback = false;
    this.elapsed = 0;
    this.accumulator = 0;
    this.constraints.forEach((c) => {
      c.lambda = 0;
    });
  }
  private sampleClip(time: number, target: THREE.Vector3[]) {
    const clip = this.clip!;
    const frame = Math.min(time * clip.fps, clip.frames - 1);
    const lower = Math.floor(frame),
      upper = Math.min(lower + 1, clip.frames - 1);
    const alpha = frame - lower,
      stride = clip.vertices * 3;
    for (let i = 0; i < target.length; i++) {
      const a = lower * stride + i * 3,
        b = upper * stride + i * 3;
      target[i].set(
        this.playbackOrigin.x +
          clip.positions[a] +
          (clip.positions[b] - clip.positions[a]) * alpha,
        this.playbackOrigin.y +
          clip.positions[a + 1] +
          (clip.positions[b + 1] - clip.positions[a + 1]) * alpha,
        this.playbackOrigin.z +
          clip.positions[a + 2] +
          (clip.positions[b + 2] - clip.positions[a + 2]) * alpha,
      );
    }
  }
  readonly timings = { solverMs: 0, meshMs: 0, normalsMs: 0 };
  readonly timeStep: number = 1 / 60;
  // Boundary and its first neighboring ring are free of artificial smoothing
  // and planar restoration. Ramp up across the next four rings.
  regularizationWeights: number[];
  positions: THREE.Vector3[];
  previous: THREE.Vector3[];
  rest: THREE.Vector3[];
  neighbors: number[][];
  constraints: {
    a: number;
    b: number;
    length: number;
    compliance: number;
    lambda: number;
  }[];
  private readonly heights: Float64Array;
  readonly renderer: DuvetMeshBinding;
  mapping: number[];
  accumulator = 0;
  elapsed = 0;
  contactRadii: number[];
  debugWireframe: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  > | null = null;
  constructor(
    public mesh: THREE.Mesh,
    public data: DuvetBinding,
    public surface: BedSurface,
    offset: THREE.Vector3,
    private readonly clip?: DuvetClip,
  ) {
    this.playbackOrigin = offset.clone();
    this.positions = data.proxyPositions.map((p) =>
      new THREE.Vector3(...(p as [number, number, number])).add(offset),
    );
    // Float64 preserves the precision of the former JavaScript number array.
    this.heights = new Float64Array(this.positions.length);
    this.previous = this.positions.map((p) => p.clone());
    this.rest = this.positions.map((p) => p.clone());
    const topology = createDuvetConstraints(data, this.positions);
    this.neighbors = topology.neighbors;
    this.regularizationWeights = topology.regularizationWeights;
    this.constraints = topology.constraints;
    // Explicit proxy clearance; render-shell offsets do not automatically define
    // the correct contact thickness. Tune this independently of regularization.
    this.contactRadii = this.positions.map(() => DUVET_COLLISION_RADIUS);
    this.renderer = new DuvetMeshBinding(
      mesh,
      data,
      this.positions,
      this.timings,
    );
    this.mapping = this.renderer.mapping;
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.setScalar(1);
    mesh.frustumCulled = false;
    if (clip) {
      if (
        clip.vertices !== this.positions.length ||
        clip.positions.length !== clip.vertices * clip.frames * 3
      )
        throw new Error('Invalid baked duvet clip');
      this.playback = true;
      this.sampleClip(0, this.positions);
      this.sampleClip(0, this.previous);
    }
    this.updateMesh();
  }
  createWireframe() {
    if (this.debugWireframe) return this.debugWireframe;
    const positionCount = this.data.proxyTriangles.length * 6;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(new Float32Array(positionCount * 3), 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xff4fd8,
      transparent: true,
      opacity: 0.72,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    this.debugWireframe = new THREE.LineSegments(geometry, material);
    this.debugWireframe.name = 'Collider_Duvet_Simulation_Proxy';
    this.debugWireframe.renderOrder = 1001;
    return this.debugWireframe;
  }
  private debugWireframeDirty = true;

  syncDebugWireframe(visible: boolean) {
    if (!visible || !this.debugWireframe || !this.debugWireframeDirty) return;
    this.updateDebugWireframe();
    this.debugWireframeDirty = false;
  }

  private updateDebugWireframe() {
    if (!this.debugWireframe) return;
    const attribute = this.debugWireframe.geometry.getAttribute('position');
    let index = 0;
    for (const [a, b, c] of this.data.proxyTriangles) {
      for (const vertex of [a, b, b, c, c, a]) {
        const point = this.positions[vertex];
        attribute.setXYZ(index, point.x, point.y, point.z);
        index += 1;
      }
    }
    attribute.needsUpdate = true;
    this.debugWireframe.geometry.computeBoundingSphere();
  }
  get finished() {
    return this.playback
      ? this.elapsed >= this.playbackDuration
      : this.elapsed > DUVET_DRAPE_SETTINGS.simulationSeconds;
  }

  applyFootCenterImpulse() {
    this.useLiveSimulation();
    const bounds = new THREE.Box3().setFromPoints(this.rest);
    // Bed head is on -X; locate the foot patch using undeformed coordinates
    // so the same fabric region is targeted even after it drapes down.
    const centerX = bounds.max.x - DUVET_PAD_IMPULSE_SETTINGS.edgeInset;
    const centerZ = bounds.max.z;
    const wasFinished = this.finished;
    this.positions.forEach((point, index) => {
      const previous = this.previous[index];
      if (wasFinished) previous.copy(point);
      const rest = this.rest[index];
      const distance = Math.hypot(rest.x - centerX, rest.z - centerZ);
      const t = Math.max(0, 1 - distance / DUVET_PAD_IMPULSE_SETTINGS.radius);
      if (t === 0) return;
      const weight = t * t * (3 - 2 * t);
      // Verlet integration encodes velocity as (position - previous) / dt.
      const velocity = (point.y - previous.y) / this.timeStep;
      previous.y =
        point.y -
        Math.min(
          DUVET_PAD_IMPULSE_SETTINGS.maxVelocityY,
          velocity + DUVET_PAD_IMPULSE_SETTINGS.velocityY * weight,
        ) *
          this.timeStep;
    });
    this.elapsed = 0;
    this.accumulator = 0;
  }

  reset(deferMeshUpdate = false) {
    this.bakedClock.reset();
    this.playback = Boolean(this.clip);
    this.positions.forEach((point, index) => {
      point.copy(this.rest[index]);
      this.previous[index].copy(this.rest[index]);
    });
    this.elapsed = 0;
    this.accumulator = 0;
    this.constraints.forEach((constraint) => {
      constraint.lambda = 0;
    });
    // UI restart defers expensive deformation/normals to the next render frame.
    if (!deferMeshUpdate) this.updateMesh();
  }

  /** Loading presents the settled bed without running a clip behind the loader. */
  settle() {
    if (!this.clip) return;
    this.playback = true;
    this.elapsed = this.playbackDuration;
    this.sampleClip((this.clip.frames - 1) / this.clip.fps, this.positions);
    this.sampleClip((this.clip.frames - 1) / this.clip.fps, this.previous);
    this.updateMesh();
  }

  step(delta: number, nowMs?: number) {
    this.timings.solverMs = 0;
    this.timings.meshMs = 0;
    this.timings.normalsMs = 0;
    if (this.finished) return;
    if (this.playback) {
      const started = performance.now();
      this.elapsed = this.bakedClock.advance(
        delta,
        this.playbackDuration,
        nowMs,
      );
      if (this.playbackDuration - this.elapsed < 1e-9)
        this.elapsed = this.playbackDuration;
      this.sampleClip(this.elapsed * this.playbackRate, this.positions);
      this.sampleClip(
        Math.max(0, this.elapsed - this.timeStep) * this.playbackRate,
        this.previous,
      );
      this.timings.solverMs = performance.now() - started;
      this.updateMesh();
      return;
    }
    const solverStarted = performance.now();
    const velocityRetention = 1 - DUVET_DRAPE_SETTINGS.velocityDamping;
    const smoothing = DUVET_DRAPE_SETTINGS.surfaceSmoothing;
    const shapeRetention = DUVET_DRAPE_SETTINGS.planarShapeRetention;
    this.accumulator += clampFrameDelta(delta);
    const h = this.timeStep;
    let advanced = false;
    while (this.accumulator >= h) {
      advanced = true;
      this.accumulator -= h;
      this.elapsed += h;
      for (let i = 0; i < this.positions.length; i++) {
        const p = this.positions[i],
          old = this.previous[i],
          x = p.x,
          y = p.y,
          z = p.z;
        p.set(
          x + (x - old.x) * velocityRetention,
          y + (y - old.y) * velocityRetention - 9.81 * h * h,
          z + (z - old.z) * velocityRetention,
        );
        old.set(x, y, z);
      }
      this.constraints.forEach((c) => (c.lambda = 0));
      for (let iteration = 0; iteration < 10; iteration++) {
        for (const c of this.constraints) {
          const a = this.positions[c.a],
            b = this.positions[c.b];
          const dx = b.x - a.x,
            dy = b.y - a.y,
            dz = b.z - a.z,
            len = Math.hypot(dx, dy, dz);
          if (len < 1e-9) continue;
          const alpha = c.compliance / (h * h),
            dl = (-(len - c.length) - alpha * c.lambda) / (2 + alpha);
          c.lambda += dl;
          const s = dl / len;
          a.x -= dx * s;
          a.y -= dy * s;
          a.z -= dz * s;
          b.x += dx * s;
          b.y += dy * s;
          b.z += dz * s;
        }
        // Lofted comforter regularization: suppress grid-scale buckling while
        // allowing broad drape. Weak planar shape memory keeps the fold stable.
        const heights = this.heights;
        // Compute all heights before applying any, preserving Jacobi smoothing.
        for (let i = 0; i < this.positions.length; i++) {
          const p = this.positions[i];
          const ring = this.neighbors[i];
          const weight = smoothing * this.regularizationWeights[i];
          if (weight === 0 || ring.length === 0) {
            heights[i] = p.y;
            continue;
          }
          let sum = 0;
          for (const j of ring) sum += this.positions[j].y;
          heights[i] = p.y * (1 - weight) + (weight * sum) / ring.length;
        }
        this.positions.forEach((p, i) => {
          p.y = heights[i];
          const retention = shapeRetention * this.regularizationWeights[i];
          p.x += (this.rest[i].x - p.x) * retention;
          p.z += (this.rest[i].z - p.z) * retention;
          this.surface.project(p, this.previous[i], this.contactRadii[i]);
        });
      }
    }
    this.timings.solverMs = performance.now() - solverStarted;
    if (advanced) this.updateMesh();
  }
  updateMesh() {
    this.renderer.updateMesh();
    this.debugWireframeDirty = true;
  }
}
