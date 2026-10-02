export interface DuvetBinding {
  renderPositions: number[][];
  proxyPositions: number[][];
  proxyTriangles: number[][];
  stretchEdges: number[][];
  bendingHinges: { opposite: number[] }[];
  bindings: [number, number[], number[]][];
}
