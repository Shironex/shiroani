// Every model the island can load, by id. A model with a file at
// public/island/models/<id>.glb renders that file; one without keeps its
// blockout primitive from Scene.tsx. Swapping in a real model is a data
// change: drop the GLB in, the page picks it up at build time.
//
// GLBs are expected meshopt-compressed with KTX2 textures (no Draco), origin
// at the bottom centre, metres, +Y up, front facing +Z.
//
// No three.js imports: the page reads this file at build time.

export const ISLAND_MODELS = [
  'island_base',
  'shop_house',
  'torii_clock',
  'bench',
  'vending_machine',
  'lanterns',
  'browser_screen',
  'islet_a',
  'islet_b',
  'islet_c',
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
