import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RedFormat,
  RepeatWrapping,
} from 'three';

// One small tileable noise texture, made on the main thread at start-up
// instead of downloaded: four octaves of value noise, 128 px square, in the
// red channel. The moon's surface, the cloud sea, the waterfalls and the mist
// all sample it at their own scales.

const SIZE = 128;

/** A hash of a lattice point, 0 to 1. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Smooth value noise on a lattice of `cells` per side that wraps at the edge. */
function valueNoise(x: number, y: number, cells: number, seed: number): number {
  const fx = (x / SIZE) * cells;
  const fy = (y / SIZE) * cells;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const at = (i: number, j: number) =>
    hash(((i % cells) + cells) % cells, ((j % cells) + cells) % cells, seed);
  const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx;
  const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
  return a + (b - a) * sy;
}

let shared: DataTexture | null = null;

/** The shared noise texture: red channel, repeating, mipmapped. */
export function noiseTexture(): DataTexture {
  if (shared) return shared;
  const data = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let v = 0;
      let amp = 0.5;
      for (let octave = 0; octave < 4; octave++) {
        v += valueNoise(x, y, 4 << octave, octave + 1) * amp;
        amp *= 0.5;
      }
      data[y * SIZE + x] = Math.round((v / 0.9375) * 255);
    }
  }
  const texture = new DataTexture(data, SIZE, SIZE, RedFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  shared = texture;
  return texture;
}
