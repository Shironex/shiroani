import { Color, MeshBasicMaterial, SRGBColorSpace, TextureLoader } from 'three';

// The open-air screen shows the real app: a capture of ShiroAni's browser,
// cropped to the screen's 16:9 and drawn unlit, a touch past white, so it
// reads as a lit screen and its brightest parts catch the bloom.

export const SCREEN_IMAGE = '/island/browser_view.webp';
/** How far past white the screen is pushed. */
const SCREEN_GAIN = 1.25;

let material: MeshBasicMaterial | null = null;

/**
 * The screen's material, its texture loading on first use. The load goes
 * through three's default loading manager, so the island's loader waits for it.
 */
export function screenMaterial(): MeshBasicMaterial {
  if (material) return material;
  const map = new TextureLoader().load(SCREEN_IMAGE);
  map.colorSpace = SRGBColorSpace;
  // The screen's UVs come from glTF, which puts the image's first row at v = 0.
  map.flipY = false;
  map.anisotropy = 8;
  material = new MeshBasicMaterial({
    name: 'browser_screen',
    map,
    color: new Color(1, 1, 1).multiplyScalar(SCREEN_GAIN),
  });
  return material;
}
