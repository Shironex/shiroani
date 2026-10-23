import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import { noiseTexture } from './noise';
import { PLACEMENTS } from './placements';
import { island } from './progress';
import { MOON_DIRECTION } from './Sky';

// The cloud sea under the island: a few stacked sheets of drifting noise, lit
// pink on the side the moon is on and violet away from it, fading into the
// haze toward the horizon. Soft puffs heap up across the sea and gather round
// the rock and the far spires where the sheets meet them, so no hard line
// shows. One shader per kind, nothing downloaded.

/** The sheets, top first: height, how much of the sheet is cloud (0 to 1), and opacity. */
const SHEETS = [
  { y: -6.8, cover: 0.3, opacity: 0.55, scale: 0.026 },
  { y: -8, cover: 0.45, opacity: 0.7, scale: 0.019 },
  { y: -9.6, cover: 0.62, opacity: 0.9, scale: 0.014 },
  { y: -12.5, cover: 1, opacity: 1, scale: 0.01 },
] as const;
/** The sheets fade out before the camera's far plane (220). */
const SHEET_SIZE = 420;
const FADE = { near: 70, far: 195 };

export const CLOUD_LIT = new Color('#e98fd0');
export const CLOUD_SHADE = new Color('#2a1d48');
const HAZE = new Color('#2b1a45');

const sheetMaterial = (cover: number, opacity: number, scale: number) =>
  new ShaderMaterial({
    uniforms: {
      noise: { value: noiseTexture() },
      time: { value: 0 },
      cover: { value: cover },
      opacity: { value: opacity },
      scale: { value: scale },
      lit: { value: CLOUD_LIT },
      shade: { value: CLOUD_SHADE },
      haze: { value: HAZE },
      moon: { value: MOON_DIRECTION },
      fade: { value: [FADE.near, FADE.far] },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D noise;
      uniform float time;
      uniform float cover;
      uniform float opacity;
      uniform float scale;
      uniform vec3 lit;
      uniform vec3 shade;
      uniform vec3 haze;
      uniform vec3 moon;
      uniform vec2 fade;
      varying vec3 vWorld;
      void main() {
        vec2 p = vWorld.xz * scale;
        float a = texture2D(noise, p + vec2(time * 0.004, time * 0.0015)).r;
        float b = texture2D(noise, p * 2.7 - vec2(time * 0.006, -time * 0.002) + 0.37).r;
        float density = a * 0.62 + b * 0.38;
        float alpha = smoothstep(1.0 - cover - 0.06, 1.0 - cover + 0.12, density);
        // Lit toward the moon, and brighter where the cloud is thick.
        vec3 toward = normalize(vec3(vWorld.x, 0.0, vWorld.z) + 1e-4);
        float moonward = dot(toward, normalize(vec3(moon.x, 0.0, moon.z))) * 0.5 + 0.5;
        float light = clamp((density - (1.0 - cover)) * 2.4 + 0.15, 0.0, 1.0) * (0.35 + 0.65 * moonward);
        // The island's lanterns warm the cloud right under it.
        float near = exp(-length(vWorld.xz) / 14.0);
        vec3 color = mix(shade, lit, light) + lit * near * 0.25;
        float dist = length(vWorld - cameraPosition);
        float far = smoothstep(fade.x, fade.y, dist);
        color = mix(color, haze, far * 0.85);
        gl_FragColor = vec4(color, alpha * opacity * (1.0 - smoothstep(0.75, 1.0, far)));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });

/** Soft round puffs that always face the camera, drawn in one call. */
export interface PuffSet {
  /** x, y, z, size (metres) per puff. */
  puffs: readonly (readonly [number, number, number, number])[];
  /** The colour on the moon side and on top, and on the far side and underneath. */
  lit: Color;
  shade: Color;
  /** Peak opacity at the middle of a puff. */
  opacity: number;
}

function puffMaterial(lit: Color, shade: Color, opacity: number) {
  return new ShaderMaterial({
    uniforms: {
      noise: { value: noiseTexture() },
      time: { value: 0 },
      lit: { value: lit },
      shade: { value: shade },
      opacity: { value: opacity },
      moon: { value: MOON_DIRECTION },
      haze: { value: HAZE },
      fade: { value: [FADE.near, FADE.far] },
    },
    vertexShader: /* glsl */ `
      uniform vec3 moon;
      attribute vec4 puff;
      varying vec2 vUv;
      varying float vSeed;
      varying float vMoonward;
      varying float vFar;
      uniform vec2 fade;
      void main() {
        vUv = uv;
        vSeed = fract(puff.x * 0.137 + puff.z * 0.071);
        vec2 flat_ = normalize(puff.xz + 1e-4);
        vMoonward = dot(flat_, normalize(moon.xz)) * 0.5 + 0.5;
        vFar = smoothstep(fade.x, fade.y, distance(puff.xyz, cameraPosition));
        vec4 view = viewMatrix * vec4(puff.xyz, 1.0);
        view.xy += position.xy * puff.w;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D noise;
      uniform float time;
      uniform vec3 lit;
      uniform vec3 shade;
      uniform vec3 haze;
      uniform float opacity;
      varying vec2 vUv;
      varying float vSeed;
      varying float vMoonward;
      varying float vFar;
      void main() {
        vec2 c = vUv - 0.5;
        float n = texture2D(noise, vUv * 0.6 + vSeed + vec2(time * 0.01, 0.0)).r;
        float r = length(c) * 2.0 + (n - 0.5) * 0.55;
        float a = smoothstep(1.0, 0.15, r) * opacity * (1.0 - vFar * 0.6);
        // Lit from above and from the moon's side, darker underneath.
        float light = clamp(vUv.y * 0.9 + (n - 0.5) * 0.6, 0.0, 1.0) * (0.35 + 0.65 * vMoonward);
        vec3 color = mix(mix(shade, lit, light), haze, vFar * 0.8);
        gl_FragColor = vec4(color, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

/** A quad of `width` by `height` as instanced geometry, to draw `count` copies at once. */
export function instancedQuad(width: number, height: number, count: number) {
  const quad = new PlaneGeometry(width, height);
  const g = new InstancedBufferGeometry();
  g.setIndex(quad.index);
  g.setAttribute('position', quad.getAttribute('position'));
  g.setAttribute('uv', quad.getAttribute('uv'));
  g.instanceCount = count;
  return g;
}

export function Puffs({ puffs, lit, shade, opacity }: PuffSet) {
  const geometry = useMemo(() => {
    const g = instancedQuad(1, 1, puffs.length);
    g.setAttribute('puff', new InstancedBufferAttribute(new Float32Array(puffs.flat()), 4));
    return g;
  }, [puffs]);
  const material = useMemo(() => puffMaterial(lit, shade, opacity), [lit, shade, opacity]);
  useFrame(() => {
    material.uniforms.time.value = island.flow;
  });
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}

/** A small deterministic random, so the puffs land in the same place every load. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Puffs ringed round the rock where the top sheets cut through it. */
function ringPuffs(): PuffSet['puffs'] {
  const rand = seeded(7);
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2 + rand() * 0.3;
    const radius = 5.5 + rand() * 5;
    out.push([
      Math.cos(angle) * radius,
      -6.8 - rand() * 3,
      Math.sin(angle) * radius,
      4.5 + rand() * 4.5,
    ]);
  }
  return out;
}

/**
 * Big puffs across the whole sea, larger with distance, so the sheets read as
 * heaped cloud rather than a flat layer at a grazing view.
 */
function seaPuffs(): PuffSet['puffs'] {
  const rand = seeded(23);
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < 110; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 14 + Math.pow(rand(), 0.8) * 140;
    out.push([
      Math.cos(angle) * radius,
      -7.4 - rand() * 2.4,
      Math.sin(angle) * radius,
      (8 + rand() * 10) * (0.6 + radius / 60),
    ]);
  }
  return out;
}

/** Puffs round each far spire's waist, where the sheets cut through it. */
function spirePuffs(): PuffSet['puffs'] {
  const rand = seeded(31);
  const out: [number, number, number, number][] = [];
  for (const { position, scale } of PLACEMENTS.far_spire) {
    const [x, , z] = position;
    for (let i = 0; i < 4; i++) {
      const angle = rand() * Math.PI * 2;
      const reach = 2.5 * scale[0];
      out.push([
        x + Math.cos(angle) * reach,
        -6.6 - rand() * 2.2,
        z + Math.sin(angle) * reach,
        (9 + rand() * 6) * scale[0],
      ]);
    }
  }
  return out;
}

const RING = [...ringPuffs(), ...spirePuffs()];
const SEA = seaPuffs();

export function Clouds() {
  const materials = useMemo(
    () => SHEETS.map(sheet => sheetMaterial(sheet.cover, sheet.opacity, sheet.scale)),
    []
  );
  useFrame(() => {
    for (const material of materials) material.uniforms.time.value = island.flow;
  });
  return (
    <>
      {SHEETS.map((sheet, i) => (
        <mesh
          key={sheet.y}
          position={[0, sheet.y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={materials[i]}
          renderOrder={-2 - i}
        >
          <planeGeometry args={[SHEET_SIZE, SHEET_SIZE]} />
        </mesh>
      ))}
      <Puffs puffs={SEA} lit={CLOUD_LIT} shade={CLOUD_SHADE} opacity={0.5} />
      <Puffs puffs={RING} lit={CLOUD_LIT} shade={CLOUD_SHADE} opacity={0.45} />
    </>
  );
}
