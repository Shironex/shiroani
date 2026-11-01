// Where every island model sits, written by the Blender export
// (tools/export_island_web.py next to the island build). Do not edit by hand:
// move the prop in the build and export again, or its baked light stays behind.
//
// glTF coordinates: metres, +Y up, the shop front faces +Z. Rotation is XYZ
// Euler radians. Linked duplicates in the build share one GLB and get one
// entry per copy here. `waterfall` is not a model: each entry is a fall on the
// island's front lip, its width in scale x and its drop in scale y.
//
// No three.js imports: the page reads this file at build time.

import type { Vec3 } from './stops';

export interface Placement {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export const PLACEMENTS = {
  island_base: [{ position: [0, -10.404, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  shop_house: [{ position: [-0.3, -0.0807, 0.5], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  shop_sign: [{ position: [-0.3, 1.5676, 2.4732], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  torii_staircase: [
    { position: [5.05, -0.4124, -0.9], rotation: [0, -0.2618, 0], scale: [1, 1, 1] },
  ],
  torii_clock: [
    { position: [5.281, 1.6499, -1.7621], rotation: [0, -0.2618, 0], scale: [1, 1, 1] },
  ],
  vending_machine: [
    { position: [1.9, 0.5498, 2.886], rotation: [0, -0.1047, 0], scale: [1, 1, 1] },
  ],
  porch: [{ position: [-0.3, -0.3186, 3.4], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  nook: [{ position: [4.4, -0.1266, 3.4], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  browser_frame: [{ position: [-5.5419, 0.0126, 0.9317], rotation: [0, 0, 0], scale: [1, 1, 1] }],
  browser_screen: [
    { position: [-5.55, 1.7376, 0.95], rotation: [0, -0.4189, 0], scale: [1, 1, 1] },
  ],
  bench: [
    { position: [0.4, 0.5498, 3], rotation: [0, 0.2618, 0], scale: [1, 1, 1] },
    { position: [3.85, 0.1934, 3.3], rotation: [0, 1.5708, 0], scale: [1, 1, 1] },
  ],
  boxset_stack: [
    { position: [0.7477, 1.0073, 2.9068], rotation: [0, 0.4363, 0], scale: [1, 1, 1] },
  ],
  lantern_post: [
    { position: [-3.25, 0.5498, 4.28], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { position: [-1.55, 0.5498, 2.67], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { position: [-0.35, 0.5498, 2.67], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { position: [2.75, 0.5498, 2.67], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { position: [3.85, 0.1934, 2.4], rotation: [0, 0, 0], scale: [1, 1, 1] },
  ],
  lantern_paper: [
    { position: [-2.35, 2.4285, 2.0275], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { position: [1.65, 2.2904, 2.0275], rotation: [0, 0, 0], scale: [1, 1, 1] },
    { position: [3.75, 2.1934, 3.95], rotation: [0, 0, 0], scale: [1, 1, 1] },
  ],
  zabuton: [
    { position: [4.7, 0.1934, 2.45], rotation: [0, 1.7104, 0], scale: [1, 1, 1] },
    { position: [3.8, 0.6209, 3.3], rotation: [0, 1.4661, 0], scale: [1, 1, 1] },
    { position: [-6.7639, 0.5126, 1.8326], rotation: [0, -0.576, 0], scale: [1, 1, 1] },
    { position: [-6.0331, 0.5126, 2.1579], rotation: [0, -0.4084, 0], scale: [1, 1, 1] },
    { position: [-5.3022, 0.5126, 2.4833], rotation: [0, -0.2409, 0], scale: [1, 1, 1] },
  ],
  islet: [
    { position: [-26, -3, -34], rotation: [0, 0.3491, 0], scale: [1, 1, 1] },
    { position: [26, -2, -50], rotation: [0, -0.6109, 0], scale: [1.6, 1.6, 1.6] },
    { position: [14, -11, 38], rotation: [0, 1.0472, 0], scale: [0.7, 0.7, 0.7] },
    { position: [-36, -4, 18], rotation: [0, 2.4435, 0], scale: [1.25, 1.25, 1.25] },
  ],
  sakura_tree_large: [
    { position: [-4.1, 0.174, -0.9], rotation: [0, -0.2094, 0], scale: [1, 1, 1] },
  ],
  sakura_tree_small: [
    { position: [7.25, 0.7176, -0.9], rotation: [0, 0.3491, 0], scale: [1, 1, 1] },
    { position: [7, -0.3253, 1.3], rotation: [0, 2.4435, 0], scale: [0.9, 0.9, 0.9] },
    { position: [6.9, -0.4214, 2.65], rotation: [0, 1.309, 0], scale: [0.75, 0.75, 0.75] },
    { position: [-2.5, 0.1583, -3.6], rotation: [0, -0.5236, 0], scale: [0.95, 0.95, 0.95] },
    { position: [-7.15, 0.343, -0.9], rotation: [0, -2.7925, 0], scale: [1.1, 1.1, 1.1] },
  ],
  flower_shrubs: [
    { position: [-2.25, -0.0047, 5], rotation: [0, 0.1745, 0], scale: [1, 1, 1] },
    { position: [1.25, -0.4293, 5.35], rotation: [0, -0.4363, 0], scale: [0.9, 0.9, 0.9] },
    { position: [3.05, -0.2023, 5.75], rotation: [0, 1.0472, 0], scale: [1.15, 1.15, 1.15] },
    { position: [5.25, 0.0734, 4.05], rotation: [0, 2.2689, 0], scale: [0.85, 0.85, 0.85] },
    { position: [-3.95, 0.2245, 2.55], rotation: [0, -2.7925, 0], scale: [0.9, 0.9, 0.9] },
    { position: [-7.35, 0.7331, 1.3], rotation: [0, 1.6581, 0], scale: [1.25, 1.25, 1.25] },
    { position: [-6.9, 2.7613, -2.3], rotation: [0, -1.0472, 0], scale: [1.1, 1.1, 1.1] },
    { position: [7.55, -0.6769, -0.2], rotation: [0, 2.9671, 0], scale: [1, 1, 1] },
    { position: [3.55, -0.1478, 1.45], rotation: [0, 0.5236, 0], scale: [0.8, 0.8, 0.8] },
  ],
  far_spire: [
    { position: [-20, -15.7, -25], rotation: [0, 0.1745, 0], scale: [0.7, 0.7, 0.7] },
    { position: [-15, -21.5, -60], rotation: [0, 2.0944, 0], scale: [1.1, 1.1, 1.1] },
    { position: [28, -17.2, -55], rotation: [0, -2.7925, 0], scale: [1, 1, 1] },
    { position: [40, -21.2, -80], rotation: [0, 1.0472, 0], scale: [1.3, 1.3, 1.3] },
    { position: [-45, -20.2, -10], rotation: [0, -1.9199, 0], scale: [1, 1, 1] },
    { position: [-50, -21.8, -30], rotation: [0, -1.0472, 0], scale: [1.2, 1.2, 1.2] },
    { position: [60, -20.5, -20], rotation: [0, 2.7925, 0], scale: [1.1, 1.1, 1.1] },
    { position: [15, -22.5, -95], rotation: [0, 0.5236, 0], scale: [1.4, 1.4, 1.4] },
  ],
  character: [{ position: [0.2027, 0.7032, 3.0034], rotation: [0, 0.6632, 0], scale: [1, 1, 1] }],
  waterfall: [
    { position: [-3.85, 0.207, 4.65], rotation: [0, 0, 0], scale: [0.65, 8, 1] },
    { position: [2.6, -0.6477, 6.5], rotation: [0, 0, 0], scale: [0.8, 8.5, 1] },
    { position: [-0.3, 0.2347, 5.6], rotation: [0, 0, 0], scale: [1.1, 9.5, 1] },
  ],
} as const satisfies Record<string, readonly Placement[]>;

/** The bake's lights by name (lanterns, windows, the vending front), for the real-time lit props. */
export const BAKE_LIGHTS = {
  lantern_paper: [-2.35, 2.178, 2.027],
  lantern_paper_02: [1.65, 2.04, 2.027],
  lantern_paper_nook: [3.75, 1.943, 3.95],
  lantern_post: [-3.25, 1.17, 4.28],
  lantern_post_02: [-1.55, 1.17, 2.67],
  lantern_post_03: [-0.35, 1.17, 2.67],
  lantern_post_04: [2.75, 1.17, 2.67],
  lantern_post_nook: [3.85, 0.813, 2.4],
  screen: [-5.713, 1.738, 1.315],
  shop_sign: [-0.3, 2.765, 3.073],
  shop_upper_left: [-1.9, 3.494, 2.2],
  shop_upper_right: [1.3, 3.494, 2.2],
  shop_window_left: [-2.2, 1.65, 2.04],
  shop_window_middle: [-0.3, 1.65, 2.04],
  shop_window_right: [1.6, 1.65, 2.04],
  torii: [5.281, 4.25, -0.762],
  vending: [1.9, 1.55, 3.586],
} as const satisfies Record<string, Vec3>;
