/** 0-based ticks on a 1/2/5 step; whole numbers only (counts can't be fractional). */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= top + step / 2; t += step) ticks.push(Math.round(t));
  return ticks;
}
