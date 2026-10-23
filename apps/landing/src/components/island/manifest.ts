// Every model the island can load, by id. A model with a file at
// public/island/models/<id>.glb renders that file; one without keeps its
// blockout primitive from blockouts.tsx. Where each one sits comes from the
// Blender export (placements.ts); a model placed more than once (lanterns,
// islets, cushions) is one GLB drawn at every placement.
//
// GLBs are meshopt-compressed with KTX2 textures (no Draco), origin at the
// bottom centre, metres, +Y up, front facing +Z. The static props carry
// baked light (baked.ts); the character, the bench, the lanterns, the
// cushions, the box sets and the islets are lit in real time.
//
// No three.js imports: the page reads this file at build time.

export const ISLAND_MODELS = [
  'island_base',
  'shop_house',
  'shop_sign',
  'porch',
  'vending_machine',
  'torii_staircase',
  'torii_clock',
  'nook',
  'browser_frame',
  'browser_screen',
  'bench',
  'boxset_stack',
  'lantern_post',
  'lantern_paper',
  'zabuton',
  'islet',
  'character',
] as const;

export type ModelId = (typeof ISLAND_MODELS)[number];

export const MODELS_PATH = '/island/models';

export function modelUrl(id: ModelId): string {
  return `${MODELS_PATH}/${id}.glb`;
}

export function isModelId(name: string): name is ModelId {
  return (ISLAND_MODELS as readonly string[]).includes(name);
}

/**
 * The character's animation clips, by role. [PLACEHOLDER CLIP NAMES] Set each
 * value to the clip name baked into character.glb once it exists.
 */
export const CHARACTER_CLIPS = {
  seatedIdle: 'seated_idle',
  wave: 'wave',
} as const;

export type ClipRole = keyof typeof CHARACTER_CLIPS;
