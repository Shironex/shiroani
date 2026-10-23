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

export interface IslandStop {
  id: StopId;
  camera: IslandCamera;
  /** Where the copy sits on the screen at this stop, clear of the subject. */
  align: 'center' | 'top' | 'bottom';
}

// Each pose is the matching stop_* camera of the Blender build, converted to
// glTF coordinates: its position, a target where its view meets the island
// (pullback: turned 7 degrees left for that camera's lens shift) and the
// vertical fov that keeps its horizontal view at 16:10. The subject sits right
// of centre at each stop so the copy keeps the left side.
export const ISLAND_STOPS: readonly IslandStop[] = [
  {
    id: 'porch',
    camera: { position: [2.75, 1.1, 4.45], target: [-11.4, 2.42, -0.34], fov: 43.8 },
    align: 'center',
  },
  {
    id: 'pullback',
    camera: { position: [-9.0, 6.0, 30.0], target: [-5.53, 2.22, 12.75], fov: 35.6 },
    align: 'top',
  },
  {
    id: 'library',
    camera: { position: [-1.2, 1.8, 7.14], target: [-0.72, 1.64, 2.64], fov: 41.1 },
    align: 'center',
  },
  {
    id: 'schedule',
    camera: { position: [2.9, 1.2, 4.38], target: [5.25, 3.81, -1.68], fov: 41.1 },
    align: 'center',
  },
  {
    id: 'diary',
    camera: { position: [4.9, 1.34, 6.4], target: [3.9, 0.13, 0.98], fov: 46.8 },
    align: 'center',
  },
  {
    id: 'browser',
    camera: { position: [-7.15, 1.76, 5.27], target: [-5.55, 1.74, 0.95], fov: 38.7 },
    align: 'center',
  },
  {
    id: 'moon',
    camera: { position: [4.21, 1.95, 2.69], target: [6.2, 13.33, -6.88], fov: 50.2 },
    align: 'bottom',
  },
];
