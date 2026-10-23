// Every model the island can load, by id. A model with a file at
// public/island/models/<id>.glb renders that file; one without keeps its
// blockout primitive from blockouts.tsx. Where each one sits comes from the
// Blender export (placements.ts); a model placed more than once (lanterns,
// islets, cushions) is one GLB drawn at every placement.
//
// GLBs are meshopt-compressed with KTX2 textures (no Draco), origin at the
// bottom centre, metres, +Y up, front facing +Z. The static props carry
// baked light (baked.ts); the character, the bench, the lanterns, the
// cushions, the box sets, the islets, the sakura trees, the shrubs and the
// far spires are lit in real time.
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
  'sakura_tree_large',
  'sakura_tree_small',
  'flower_shrubs',
  'far_spire',
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
 * Every clip baked into character.glb: the Mixamo clips retargeted to her rig,
 * and sitting_wave, the wave's right arm over her seated pose (`waving` itself
 * stands her up).
 */
export const CHARACTER_CLIP_NAMES = [
  'sitting_idle_hug',
  'sitting_idle',
  'sitting',
  'sitting_2',
  'sitting_hug',
  'hug_boxes',
  'sitting_clap',
  'sitting_clap_2',
  'sitting_laughing',
  'sitting_thumbs_up',
  'sit_to_stand',
  'happy_idle',
  'waving',
  'sitting_wave',
] as const;

export type CharacterClip = (typeof CHARACTER_CLIP_NAMES)[number];

/** The clip that plays in each role. */
export const CHARACTER_CLIPS = {
  /** Seated on the porch bench, hugging the box sets: the loop at every stop. */
  seatedIdle: 'sitting_idle_hug',
  /** Waving from the bench at the moon stop. */
  wave: 'sitting_wave',
} as const satisfies Record<string, CharacterClip>;

export type ClipRole = keyof typeof CHARACTER_CLIPS;
