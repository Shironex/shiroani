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
import { Puffs, type PuffSet } from './Clouds';
import { noiseTexture } from './noise';
import { PLACEMENTS, type Placement } from './placements';
import { island } from './progress';

// The waterfalls pouring off the island's front lip into the clouds. Each one
// is a curved sheet that leaves the lip, bows out from the rock and widens as
// it falls, with streaks scrolling down it and mist where it meets the cloud
// sea. The lips, widths and drops come from the Blender build (placements.ts).

/** Segments down each sheet. */
const SEGMENTS = 32;
/** How far the sheet bows out from the lip: `OUT.lip + OUT.k * sqrt(drop so far)`, metres. */
const OUT = { lip: 0.12, k: 0.55 };
/** How much wider the sheet is at the bottom than at the lip. */
const SPREAD = 0.45;
const WATER = new Color('#e4d4ff');
const MIST = new Color('#e2cdf5');
const MIST_SHADE = new Color('#8f74b8');

/** A sheet in its placement's frame: the lip at the origin, falling down -Y and out along +Z. */
function sheetGeometry(width: number, drop: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const sizes: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const v = i / SEGMENTS;
    const fallen = drop * v * v * 0.35 + drop * v * 0.65;
    const out = OUT.lip + OUT.k * Math.sqrt(fallen);
    const half = (width * (1 + SPREAD * v)) / 2;
    positions.push(-half, -fallen, out, half, -fallen, out);
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
    varying vec2 vUv;
    varying vec2 vSize;
    void main() {
      // Long streaks: little noise across the sheet, much along it, scrolling down.
      float along = vUv.y * vSize.y;
      float s1 = texture2D(noise, vec2(vUv.x * vSize.x * 0.9, along * 0.035 - time * 0.22)).r;
      float s2 = texture2D(noise, vec2(vUv.x * vSize.x * 2.1 + 0.4, along * 0.06 - time * 0.4)).r;
      float streak = smoothstep(0.38, 0.78, s1) * 0.65 + smoothstep(0.45, 0.85, s2) * 0.55;
      float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
      float bottom = 1.0 - smoothstep(0.5, 1.0, vUv.y);
      // White water where it tips over the lip.
      float lip = 1.0 - smoothstep(0.0, 0.07, vUv.y);
      float a = (0.05 + streak * 0.5 + lip * 0.35) * edge * bottom;
      gl_FragColor = vec4(color * a * (1.0 + streak * 0.45), 1.0);
    }
  `,
  blending: AdditiveBlending,
  transparent: true,
  depthWrite: false,
  side: DoubleSide,
});

/** Mist at the foot of each fall, where it sinks into the clouds. */
function mistPuffs(falls: readonly Placement[]): PuffSet['puffs'] {
  const out: [number, number, number, number][] = [];
  for (const { position, scale } of falls) {
    const [x, y, z] = position;
    const [width, drop] = scale;
    const foot = y - drop * 0.78;
    const reach = OUT.lip + OUT.k * Math.sqrt(drop * 0.78);
    out.push(
      [x, foot, z + reach, width * 3.2],
      [x - width * 0.9, foot - 0.6, z + reach + 0.4, width * 2.6],
      [x + width * 0.8, foot - 0.3, z + reach + 0.2, width * 2.4],
      [x, foot + drop * 0.18, z + reach * 0.85, width * 1.8]
    );
  }
  return out;
}

const FALLS = PLACEMENTS.waterfall;
const MIST_PUFFS = mistPuffs(FALLS);

export function Waterfalls() {
  const sheets = useMemo(
    () => FALLS.map(({ scale: [width, drop] }) => sheetGeometry(width, drop)),
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
      <Puffs puffs={MIST_PUFFS} lit={MIST} shade={MIST_SHADE} opacity={0.5} />
    </>
  );
}
