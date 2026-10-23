import { MeshBasicMaterial, MeshStandardMaterial, type Mesh, type Object3D } from 'three';

// Baked light. The static props come out of Blender with their night light
// baked: Cycles irradiance (moonlight, lantern and window pools, contact
// shadows) plus their glow, divided by `scale` so it fits a texture. The GLB
// carries it as the emissive texture with material extras { lightmap: scale };
// here each such material becomes an unlit one that multiplies the albedo by
// the bake. The glow parts come out brighter than white, so bloom picks up the
// lantern paper, shop windows, sign panel and vending front. Real-time lights
// only reach the character and the props placed more than once.

const converted = new WeakMap<MeshStandardMaterial, MeshBasicMaterial>();

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
