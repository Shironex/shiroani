/**
 * Shared per-frame state, written by the camera rig and read by the scene's
 * animations. `p` is the scroll position in stops: 0 at the porch, 1 at the
 * pullback, and so on up to the last stop (the moon). `t` is the clock in
 * seconds; `flow` is the clock that drives the ambient motion (water, clouds,
 * petals, the signboard) and stands still under reduced motion. No three.js
 * imports.
 */
export const island = { p: 0, t: 0, flow: 0 };

/** How fast (per second) the camera, and the moon with it, chase the scroll. */
export const CAMERA_FOLLOW_RATE = 5;

/** Each stop holds still while its section is in this window, blending to the next outside it. */
export const HOLD = { from: 0.25, to: 0.75 } as const;

/**
 * Where scroll position `p` is between two stops: the stop it leaves (`i`) and
 * how far it has blended toward the next one (0 to 1), holding on each stop
 * for the middle of its section. `count` is the number of stops.
 */
export function segment(p: number, count: number): { i: number; blend: number } {
  const i = Math.max(0, Math.min(Math.floor(p), count - 2));
  return { i, blend: smoothstep(p - i, HOLD.from, HOLD.to) };
}

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
