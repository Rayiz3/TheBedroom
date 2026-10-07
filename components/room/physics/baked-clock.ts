/** Wall time begins at the first displayed sample, not at the previous canvas frame. */
export class BakedClock {
  private startedAt: number | null = null;
  private elapsed = 0;
  reset() {
    this.startedAt = null;
    this.elapsed = 0;
  }
  advance(delta: number, duration: number, nowMs?: number) {
    if (nowMs !== undefined) {
      if (this.startedAt === null) this.startedAt = nowMs;
      this.elapsed = Math.min(
        duration,
        Math.max(this.elapsed, (nowMs - this.startedAt) / 1000),
      );
    } else this.elapsed = Math.min(duration, this.elapsed + Math.max(0, delta));
    return this.elapsed;
  }
}
