/**
 * Shared per-frame state, written by the camera rig and read by the scene's
 * animations. `p` is the scroll position in stops: 0 at the porch, 1 at the
 * pullback, and so on up to the last stop (the moon). No three.js imports.
 */
export const island = { p: 0, t: 0 };

/** 1 while the scroll sits on stop `k`, easing to 0 by `reach` stops away. */
export function near(k: number, reach = 0.75): number {
  return smoothstep(1 - Math.abs(island.p - k) / reach, 0, 1);
}

/** 0 before scroll position `from`, 1 after `to`, smooth in between. */
export function ramp(from: number, to: number): number {
  return smoothstep(island.p, from, to);
}

/** three's MathUtils.smoothstep: 0 at or below `min`, 1 at or above `max`. */
function smoothstep(x: number, min: number, max: number): number {
  if (x <= min) return 0;
  if (x >= max) return 1;
  const k = (x - min) / (max - min);
  return k * k * (3 - 2 * k);
}
