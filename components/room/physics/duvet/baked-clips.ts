import single from './baked/single';
import queen from './baked/queen';
import type { DuvetClip } from './duvet-physics';
const cache = new Map<string, DuvetClip>();
export function getBakedDuvetClip(size: 'single' | 'queen'): DuvetClip {
  const existing = cache.get(size);
  if (existing) return existing;
  const data = size === 'single' ? single : queen;
  const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  const clip = {
    fps: data.fps,
    vertices: data.vertices,
    frames: data.frames,
    positions: new Float32Array(bytes.buffer),
  };
  cache.set(size, clip);
  return clip;
}
