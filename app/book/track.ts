/**
 * Where the flat Pila sits against the probe line (the canvas centre), given the on-screen centres of its items, top
 * to bottom: the fractional index of the item at the probe, and how many px the list's end lies past the probe once
 * the probe is beyond either end (positive: the list is lower on screen).
 */
export function trackList(
  centres: readonly number[],
  probe: number,
): { index: number; offset: number } {
  const first = centres[0];
  const last = centres.at(-1);
  if (first === undefined || last === undefined) return { index: 0, offset: 0 };
  if (probe <= first) return { index: 0, offset: first - probe };
  if (probe >= last) return { index: centres.length - 1, offset: last - probe };
  const next = centres.findIndex((centre) => centre > probe);
  const above = centres[next - 1] ?? first;
  const below = centres[next] ?? last;
  return { index: next - 1 + (probe - above) / (below - above), offset: 0 };
}
