// How far the 3D layer has got before its first frame, from 0 to 1: the book chunk reports it, the first-visit cover
// counts it (#32). It only moves forward, because books mounting later add covers to draw.

let progress = 0;
const listeners = new Set<() => void>();

export function reportProgress(value: number) {
  if (value <= progress) return;
  progress = Math.min(value, 1);
  for (const listener of listeners) listener();
}

export const loadProgress = () => progress;

export function subscribeToProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
