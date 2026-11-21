/**
 * How far down a track of equal steps the screen's centre is, in steps: 0 at the first step's centre, clamped to the
 * last. The Hélice's 3D scene follows it.
 */
export function stepInView(track: Element): number {
  const steps = track.children;
  const first = steps[0]?.getBoundingClientRect();
  if (!first) return 0;
  const second = steps[1]?.getBoundingClientRect();
  const step = second ? second.top - first.top : first.height;
  const centre = first.top + first.height / 2;
  return Math.min(
    Math.max((innerHeight / 2 - centre) / step, 0),
    steps.length - 1,
  );
}
