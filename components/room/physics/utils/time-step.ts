/** Preserve the simulation's existing per-frame catch-up limit. */
export function clampFrameDelta(delta: number, maxFrameSeconds = 0.05) {
  return Math.min(delta, maxFrameSeconds);
}
