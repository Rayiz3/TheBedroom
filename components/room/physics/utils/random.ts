export function sampleTruncatedNormalXZ(
  sigma: number,
  limit: number,
  random = Math.random,
) {
  if (sigma <= 0 || limit <= 0) return { x: 0, z: 0 };
  // Box–Muller: independent zero-mean normal samples, truncated to a disk.
  for (let attempt = 0; attempt < 100; attempt++) {
    const radius = sigma * Math.sqrt(-2 * Math.log(1 - random()));
    const angle = 2 * Math.PI * random();
    if (radius <= limit) {
      return { x: radius * Math.cos(angle), z: radius * Math.sin(angle) };
    }
  }
  return { x: 0, z: 0 };
}
