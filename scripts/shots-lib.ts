export function screenshotName(
  viewport: string,
  path: string,
  screen: number,
): string {
  const slug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${viewport}-${slug || "home"}-${screen}.png`;
}

export interface FrameStats {
  averageFps: number;
  worstFrameMs: number;
}

// Takes requestAnimationFrame timestamps; null when there are too few to measure.
export function frameStats(timestamps: readonly number[]): FrameStats | null {
  if (timestamps.length < 2) return null;
  const gaps = timestamps
    .slice(1)
    .map((time, i) => time - (timestamps[i] ?? time));
  const elapsed = gaps.reduce((sum, gap) => sum + gap, 0);
  return {
    averageFps: (1000 * gaps.length) / elapsed,
    worstFrameMs: Math.max(...gaps),
  };
}
