import * as THREE from 'three';

type CollisionNode = {
  bounds: THREE.Box3;
  triangles?: THREE.Triangle[];
  left?: CollisionNode;
  right?: CollisionNode;
};

function collisionTree(triangles: THREE.Triangle[]): CollisionNode {
  const bounds = new THREE.Box3();
  for (const t of triangles)
    bounds.expandByPoint(t.a).expandByPoint(t.b).expandByPoint(t.c);
  if (triangles.length <= 12) return { bounds, triangles };
  const size = bounds.getSize(new THREE.Vector3());
  const axis =
    size.x >= size.y && size.x >= size.z ? 'x' : size.y >= size.z ? 'y' : 'z';
  triangles.sort(
    (a, b) =>
      a.a[axis] + a.b[axis] + a.c[axis] - (b.a[axis] + b.b[axis] + b.c[axis]),
  );
  const middle = Math.floor(triangles.length / 2);
  return {
    bounds,
    left: collisionTree(triangles.slice(0, middle)),
    right: collisionTree(triangles.slice(middle)),
  };
}

// Bounds only accelerate nearest-triangle queries; contact uses the mesh surface.
export class MeshContactSurface {
  translation = new THREE.Vector3();
  pivot = new THREE.Vector3();
  rotation = new THREE.Quaternion();
  private inverseRotation = new THREE.Quaternion();
  private queryPoint = new THREE.Vector3();
  tree: CollisionNode;
  name: string;
  private point = new THREE.Vector3();
  private closest = new THREE.Vector3();
  private faceNormal = new THREE.Vector3();
  createWireframe() {
    const positions: number[] = [];
    const visit = (node: CollisionNode) => {
      for (const t of node.triangles ?? []) {
        for (const p of [t.a, t.b, t.b, t.c, t.c, t.a])
          positions.push(p.x, p.y, p.z);
      }
      if (node.left) visit(node.left);
      if (node.right) visit(node.right);
    };
    visit(this.tree);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const material = new THREE.LineBasicMaterial({
      color: /pillow/i.test(this.name)
        ? 0xffa640
        : /mattress/i.test(this.name)
          ? 0x00d5ff
          : 0x60ed83,
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const lines = new THREE.LineSegments(geometry, material);
    lines.name = `Collider_${this.name}`;
    lines.renderOrder = 1000;
    return lines;
  }
  constructor(mesh: THREE.Mesh) {
    this.name = mesh.name;
    const p = mesh.geometry.getAttribute('position'),
      index = mesh.geometry.index;
    const triangles: THREE.Triangle[] = [];
    for (let i = 0; i < (index?.count ?? p.count); i += 3) {
      const vertices = [0, 1, 2].map((k) =>
        new THREE.Vector3()
          .fromBufferAttribute(p, index ? index.getX(i + k) : i + k)
          .applyMatrix4(mesh.matrixWorld),
      );
      const triangle = new THREE.Triangle(
        vertices[0],
        vertices[1],
        vertices[2],
      );
      if (triangle.getArea() > 1e-12) triangles.push(triangle);
    }
    this.tree = collisionTree(triangles);
  }
  distance(p: THREE.Vector3, normal: THREE.Vector3, maxDistance = Infinity) {
    p = this.queryPoint
      .copy(p)
      .sub(this.translation)
      .sub(this.pivot)
      .applyQuaternion(this.inverseRotation.copy(this.rotation).invert())
      .add(this.pivot);
    if (this.tree.bounds.distanceToPoint(p) > maxDistance) return Infinity;
    let best = Infinity;
    const visit = (node: CollisionNode) => {
      if (node.bounds.distanceToPoint(p) ** 2 > best) return;
      if (node.triangles) {
        for (const t of node.triangles) {
          t.closestPointToPoint(p, this.point);
          const d = this.point.distanceToSquared(p);
          if (d < best) {
            best = d;
            this.closest.copy(this.point);
            t.getNormal(this.faceNormal);
          }
        }
      } else if (node.left && node.right) {
        const leftFirst =
          node.left.bounds.distanceToPoint(p) <
          node.right.bounds.distanceToPoint(p);
        visit(leftFirst ? node.left : node.right);
        visit(leftFirst ? node.right : node.left);
      }
    };
    visit(this.tree);
    normal.subVectors(p, this.closest);
    // A concave seam's nearest face can point away from a distant exterior
    // point. A point outside the enclosing bounds is always outside the mesh.
    const sign =
      this.tree.bounds.containsPoint(p) && normal.dot(this.faceNormal) < 0
        ? -1
        : 1;
    if (best > 1e-16) normal.normalize().multiplyScalar(sign);
    else normal.copy(this.faceNormal);
    normal.applyQuaternion(this.rotation);
    return Math.sqrt(best) * sign;
  }
}
