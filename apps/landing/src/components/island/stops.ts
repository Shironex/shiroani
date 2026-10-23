// The camera stops of the moon island, in scroll order. This is the
// file to tune: camera poses and lens per stop. The copy for each stop lives
// in lib/i18n.ts under `island.<id>.*`.
//
// Island coordinates are metres. +X runs right along the shop front, +Y is up
// (the porch deck at 0.2, the island top at 0) and +Z points from the shop out
// over the porch toward the viewer. Scene.tsx places every model.
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

export interface IslandStop {
  id: StopId;
  camera: IslandCamera;
  /** Where the copy sits on the screen at this stop, clear of the subject. */
  align: 'center' | 'top' | 'bottom';
}

// [PLACEHOLDER CAMERAS] Framed on the blockout primitives in Scene.tsx. Retune
// every pose once the real island GLBs land; the subject sits right of centre
// at each stop so the copy keeps the left side.
export const ISLAND_STOPS: readonly IslandStop[] = [
  {
    id: 'porch',
    camera: { position: [-1.0, 1.45, 5.0], target: [-0.4, 1.0, -0.8], fov: 36 },
    align: 'center',
  },
  {
    id: 'pullback',
    camera: { position: [7.5, 6.5, 15], target: [0.5, 0.2, -0.5], fov: 42 },
    align: 'top',
  },
  {
    id: 'library',
    camera: { position: [-2.4, 1.5, 2.2], target: [-2.0, 1.4, -1.1], fov: 38 },
    align: 'center',
  },
  {
    id: 'schedule',
    camera: { position: [-6.6, 1.9, 6.4], target: [-4.6, 1.9, 1.6], fov: 38 },
    align: 'center',
  },
  {
    id: 'diary',
    camera: { position: [-5.4, 1.3, 1.2], target: [-3.8, 0.8, -2.2], fov: 40 },
    align: 'center',
  },
  {
    id: 'browser',
    camera: { position: [1.0, 1.8, 5.6], target: [2.6, 1.6, 1.0], fov: 38 },
    align: 'center',
  },
  {
    id: 'moon',
    camera: { position: [-2.0, 1.8, 6.5], target: [5, 8, -14], fov: 46 },
    align: 'bottom',
  },
];
