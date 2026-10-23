import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ShaderMaterial,
} from 'three';
import { Puffs, seeded, type PuffSet } from './Clouds';
import { noiseTexture } from './noise';
import { PLACEMENTS, type Placement } from './placements';
import { island } from './progress';

// The waterfalls pouring off the island's front lip into the clouds. Each one
// is a sheet that rolls over the lip, arcs out from the rock and widens as it
// falls, pinching and swelling along the way and swaying a little to the side,
// with streaks meandering down it, white water where it tips over and where
// it breaks on a ledge, and spray at its foot that melts into the cloud tops.
// The lips, widths and drops come from the Blender build (placements.ts).

/** Segments down each sheet. */
const SEGMENTS = 48;
/** How far the sheet arcs out from the lip: `OUT.lip + OUT.k * sqrt(drop so far)`, metres. */
const OUT = { lip: 0.1, k: 0.78 };
/** How much wider the sheet is at the bottom than at the lip. */
const SPREAD = 0.6;
/** The width pinches and swells by this share along the fall, and the sheet sways this share of its width. */
const WOBBLE = { width: 0.34, sway: 0.55 };
/** Where (share of the drop) each fall breaks on a ledge. */
const LEDGE = 0.36;
/** Where the cloud tops are: the spray settles there (Clouds.tsx, SEA_TOP). */
const SPRAY_Y = -7.2;
const WATER = new Color('#e4d4ff');
const MIST = new Color('#e2cdf5');
const MIST_SHADE = new Color('#8f74b8');

/** A sheet in its placement's frame: the lip at the origin, falling down -Y and out along +Z. */
function sheetGeometry(width: number, drop: number, seed: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const sizes: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const v = i / SEGMENTS;
    const fallen = drop * v * v * 0.35 + drop * v * 0.65;
    const out = OUT.lip + OUT.k * Math.sqrt(fallen);
    // Pinches and swells, and a slow sway to the side, growing away from the lip.
    const pinch =
      1 + WOBBLE.width * (Math.sin(v * 6.3 + seed) * 0.65 + Math.sin(v * 15.1 + seed * 2.3) * 0.35);
    const half = (width * (1 + SPREAD * v) * (v < 0.08 ? 1 : pinch)) / 2;
    const sway = Math.sin(v * 3.4 + seed * 1.7) * width * WOBBLE.sway * Math.min(v * 3, 1);
    positions.push(sway - half, -fallen, out, sway + half, -fallen, out);
    uvs.push(0, v, 1, v);
    sizes.push(width, drop, width, drop);
    if (i < SEGMENTS) {
      const a = i * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setAttribute('size', new BufferAttribute(new Float32Array(sizes), 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  return g;
}

const waterMaterial = new ShaderMaterial({
  uniforms: {
    noise: { value: noiseTexture() },
    time: { value: 0 },
    color: { value: WATER },
    ledge: { value: LEDGE },
  },
  vertexShader: /* glsl */ `
    attribute vec2 size;
    varying vec2 vUv;
    varying vec2 vSize;
    void main() {
      vUv = uv;
      vSize = size;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D noise;
    uniform float time;
    uniform vec3 color;
    uniform float ledge;
    varying vec2 vUv;
    varying vec2 vSize;
    void main() {
      // Long streaks: little noise across the sheet, much along it, scrolling
      // down and meandering from side to side.
      float along = vUv.y * vSize.y;
      float meander = (texture2D(noise, vec2(along * 0.02 - time * 0.05, 0.31)).r - 0.5) * 0.35;
      float x = vUv.x + meander;
      float s1 = texture2D(noise, vec2(x * vSize.x * 0.9, along * 0.035 - time * 0.22)).r;
      float s2 = texture2D(noise, vec2(x * vSize.x * 2.1 + 0.4, along * 0.06 - time * 0.4)).r;
      float streak = smoothstep(0.38, 0.78, s1) * 0.65 + smoothstep(0.45, 0.85, s2) * 0.55;
      // Ragged edges: the sheet frays into strands along its sides.
      float fray = texture2D(noise, vec2(vUv.x * 3.0 + 0.7, along * 0.05 - time * 0.3)).r;
      float edge = smoothstep(0.0, 0.22 + fray * 0.18, vUv.x) * smoothstep(1.0, 0.78 - fray * 0.18, vUv.x);
      float bottom = 1.0 - smoothstep(0.55, 1.0, vUv.y);
      // White water where it tips over the lip and where it breaks on the ledge.
      float lip = 1.0 - smoothstep(0.0, 0.08, vUv.y);
      float churn = texture2D(noise, vec2(x * vSize.x * 3.0, along * 0.12 - time * 0.6)).r;
      float breakFoam = exp(-pow((vUv.y - ledge) * 11.0, 2.0)) * (0.5 + churn);
      float foam = clamp(lip * 0.45 + breakFoam * 0.55, 0.0, 1.0);
      float a = (0.05 + streak * 0.5 + foam) * edge * bottom;
      gl_FragColor = vec4(color * a * (1.0 + streak * 0.45 + foam * 0.6), 1.0);
    }
  `,
  blending: AdditiveBlending,
  transparent: true,
  depthWrite: false,
  side: DoubleSide,
});

/**
 * Spray round the foot of each fall: a column of mist rising off the break
 * and widening into the cloud tops, plus a little at the ledge, so the water
 * melts into the sea instead of ending.
 */
function mistPuffs(falls: readonly Placement[]): PuffSet['puffs'] {
  const rand = seeded(41);
  const out: [number, number, number, number][] = [];
  for (const { position, scale } of falls) {
    const [x, y, z] = position;
    const [width, drop] = scale;
    const reach = OUT.lip + OUT.k * Math.sqrt(drop * 0.85);
    const foot = Math.max(y - drop * 0.85, SPRAY_Y);
    for (let k = 0; k < 7; k++) {
      const rise = k / 6;
      out.push([
        x + (rand() - 0.5) * width * (1.5 + rise * 2),
        foot + rise * drop * 0.22 - 0.4,
        z + reach + (rand() - 0.3) * width,
        width * (3.4 - rise * 1.6) * (0.8 + rand() * 0.4),
      ]);
    }
    const ledge = y - drop * (LEDGE * LEDGE * 0.35 + LEDGE * 0.65);
    out.push([x, ledge, z + OUT.lip + OUT.k * Math.sqrt(y - ledge) + 0.15, width * 1.3]);
  }
  return out;
}

const FALLS = PLACEMENTS.waterfall;
const MIST_PUFFS = mistPuffs(FALLS);

export function Waterfalls() {
  const sheets = useMemo(
    () => FALLS.map(({ scale: [width, drop] }, i) => sheetGeometry(width, drop, i * 2.4 + 0.7)),
    []
  );
  useFrame(() => {
    waterMaterial.uniforms.time.value = island.flow;
  });
  return (
    <>
      {FALLS.map((at, i) => (
        <mesh
          key={at.position.join()}
          position={at.position}
          rotation={at.rotation}
          geometry={sheets[i]}
          material={waterMaterial}
        />
      ))}
      <Puffs puffs={MIST_PUFFS} lit={MIST} shade={MIST_SHADE} opacity={0.42} />
    </>
  );
}
