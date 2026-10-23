import { Color, MeshBasicMaterial, MeshStandardMaterial, type Mesh, type Object3D } from 'three';

// Baked light. The static props come out of Blender with their night light
// baked: Cycles irradiance (moonlight, lantern and window pools, contact
// shadows) plus their glow, divided by `scale` so it fits a texture. The GLB
// carries it as the emissive texture with material extras { lightmap: scale };
// here each such material becomes an unlit one that multiplies the albedo by
// the bake. The glow parts come out brighter than white, so bloom picks up the
// lantern paper, shop windows, sign panel and vending front. Real-time lights
// only reach the character and the props placed more than once.

const converted = new WeakMap<MeshStandardMaterial, MeshBasicMaterial>();

/**
 * The grade on top of the bake, per baked material: the rock takes the
 * concepts' pinker moonlight, the timber and the shop a warmer lantern glow.
 */
const TINTS: Record<string, Color> = {
  island_base_baked: new Color('#ffd2f4').multiplyScalar(1.12),
  torii_staircase_baked: new Color('#ffd2f4').multiplyScalar(1.08),
  shop_house_baked: new Color('#fff0dc').multiplyScalar(1.08),
  porch_deck_baked: new Color('#ffe6d2').multiplyScalar(1.06),
  nook_deck_baked: new Color('#ffe6d2').multiplyScalar(1.06),
};

function unlit(source: MeshStandardMaterial, scale: number): MeshBasicMaterial {
  let material = converted.get(source);
  if (!material) {
    material = new MeshBasicMaterial({
      name: source.name,
      map: source.map,
      lightMap: source.emissiveMap,
      // three divides the light map by pi for unlit materials.
      lightMapIntensity: scale * Math.PI,
      side: source.side,
      color: TINTS[source.name] ?? new Color(1, 1, 1),
    });
    converted.set(source, material);
  }
  return material;
}

/** Swaps every lightmapped material under `root` for its unlit, baked copy. */
export function applyBakedLight(root: Object3D) {
  root.traverse(child => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material;
    if (!(source instanceof MeshStandardMaterial)) return;
    const scale = source.userData.lightmap;
    if (typeof scale === 'number' && source.emissiveMap) mesh.material = unlit(source, scale);
  });
}
