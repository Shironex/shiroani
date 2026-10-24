// The camera stops of the moon island, in scroll order. This is the
// file to tune: camera poses and lens per stop. The copy for each stop lives
// in lib/i18n.ts under `island.<id>.*`.
//
// Island coordinates are metres. +X runs right along the shop front, +Y is up
// (the porch deck at 0.55, the island top around 0) and +Z points from the
// shop out over the porch toward the viewer. placements.ts places every model.
//
// No three.js imports here: the page and the canvas both read this file, and
// it must not pull three into the page bundle.

export type Vec3 = readonly [number, number, number];

export type StopId = 'porch' | 'pullback' | 'library' | 'schedule' | 'diary' | 'browser' | 'moon';

export interface IslandCamera {
  position: Vec3;
  target: Vec3;
  /** Vertical field of view in degrees (28 mm ≈ 46, 35 mm ≈ 38, 50 mm ≈ 27). */
  fov: number;
}

/**
 * Where the moon hangs for a stop: a point far out in the sky (it is drawn
 * without fog or depth against the dome) and a size multiplier. Between stops
 * it glides along the sky with the camera, so each framing gets its moon.
 */
export interface IslandMoon {
  at: Vec3;
  scale: number;
}

export interface IslandStop {
  id: StopId;
  camera: IslandCamera;
  moon: IslandMoon;
  /** Where the copy sits on the screen at this stop, clear of the subject. */
  align: 'center' | 'top' | 'bottom';
}

// Each pose is the matching stop_* camera of the Blender build, converted to
// glTF coordinates: its position, a target where its view meets the island
// (pullback: turned 7 degrees left for that camera's lens shift) and the
// vertical fov that keeps its horizontal view at 16:10. The subject sits right
// of centre at each stop so the copy keeps the left side. The browser stop
// sits higher and closer than its Blender camera, so the rock lumps on the
// island's edge stay under the screen instead of covering its lower edge.
//
// The moon: low in the west beside Shiro-chan at the porch and moon stops
// (concept 6b), the shop hiding most of it at the porch; up behind the torii
// clock at the pullback and the schedule stop (concept 1). The stops between
// look away from both, and the moon moves while the camera turns, so the
// swap never shows.
const MOON_WEST: IslandMoon = { at: [-77.5, 32.5, -25.2], scale: 1 };
const MOON_TORII: IslandMoon = { at: [45.1, 54.4, -62.1], scale: 1 };
export const ISLAND_STOPS: readonly IslandStop[] = [
  {
    id: 'porch',
    camera: { position: [2.75, 1.1, 4.45], target: [-11.4, 2.42, -0.34], fov: 43.8 },
    moon: MOON_WEST,
    align: 'center',
  },
  {
    id: 'pullback',
    camera: { position: [-9.0, 6.0, 30.0], target: [-5.53, 2.22, 12.75], fov: 35.6 },
    moon: { at: [41.4, 9.2, -78.8], scale: 1.3 },
    align: 'top',
  },
  {
    id: 'library',
    camera: { position: [-1.2, 1.8, 7.14], target: [-0.72, 1.64, 2.64], fov: 41.1 },
    moon: MOON_TORII,
    align: 'center',
  },
  {
    id: 'schedule',
    camera: { position: [2.9, 1.2, 4.38], target: [5.25, 3.81, -1.68], fov: 41.1 },
    moon: MOON_TORII,
    align: 'center',
  },
  {
    id: 'diary',
    camera: { position: [4.9, 1.34, 6.4], target: [3.9, 0.13, 0.98], fov: 46.8 },
    moon: MOON_TORII,
    align: 'center',
  },
  {
    id: 'browser',
    camera: { position: [-7.1, 2.1, 5.05], target: [-6.4, 1.6, 1.1], fov: 39 },
    moon: MOON_TORII,
    align: 'center',
  },
  {
    id: 'moon',
    camera: { position: [2.9, 1.0, 5.4], target: [-5.89, 3.08, 1.11], fov: 46 },
    moon: MOON_WEST,
    align: 'bottom',
  },
];
