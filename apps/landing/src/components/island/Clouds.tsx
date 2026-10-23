import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { noiseTexture } from './noise';
import { PLACEMENTS } from './placements';
import { island } from './progress';
import { MOON_DIRECTION } from './Sky';

// The cloud sea under the island: a few stacked sheets of drifting noise, lit
// pink on the side the moon is on and violet away from it, fading into the
// haze toward the horizon. The top sheet is shaded from its own relief, so the
// sea reads as a surface. Billows heap up out of it across the sea and gather
// round the rock and the far spires where the sheets meet them: round sprites
// shaded like lumpy spheres, with a moonlit pink rim and violet undersides,
// sinking into the sea at their feet. One shader per kind, nothing downloaded.

/**
 * The sheets, top first: height, how much of the sheet is cloud (0 to 1),
 * opacity, noise scale and how strongly its relief catches the moon.
 */
const SHEETS = [
  { y: -6.8, cover: 0.34, opacity: 0.7, scale: 0.026, relief: 1 },
  { y: -8, cover: 0.5, opacity: 0.85, scale: 0.019, relief: 0.7 },
  { y: -9.6, cover: 0.66, opacity: 0.95, scale: 0.014, relief: 0.4 },
  { y: -12.5, cover: 1, opacity: 1, scale: 0.01, relief: 0 },
] as const;
/** Where the billows' feet sink into the sea. */
const SEA_TOP = -7.4;
/** The sheets fade out before the camera's far plane (220). */
const SHEET_SIZE = 420;
const FADE = { near: 70, far: 195 };
/** Billows keep their shape further out than the sheets, so the far sea stays sculpted. */
const BILLOW_FADE = { near: 105, far: 215 };

export const CLOUD_LIT = new Color('#e98fd0');
export const CLOUD_SHADE = new Color('#2a1d48');
/** The billows: the violet body, the moonlit pink rim and the shade underneath. */
const BILLOW = {
  body: new Color('#7c5fae'),
  rim: new Color('#ffb6e6'),
  shade: new Color('#2e2152'),
};
const HAZE = new Color('#2b1a45');

const sheetMaterial = (cover: number, opacity: number, scale: number, relief: number) =>
  new ShaderMaterial({
    uniforms: {
      noise: { value: noiseTexture() },
      time: { value: 0 },
      cover: { value: cover },
      opacity: { value: opacity },
      scale: { value: scale },
      relief: { value: relief },
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
      uniform float relief;
      uniform vec3 lit;
      uniform vec3 shade;
      uniform vec3 haze;
      uniform vec3 moon;
      uniform vec2 fade;
      varying vec3 vWorld;
      float density(vec2 p) {
        float a = texture2D(noise, p + vec2(time * 0.004, time * 0.0015)).r;
        float b = texture2D(noise, p * 2.7 - vec2(time * 0.006, -time * 0.002) + 0.37).r;
        return a * 0.62 + b * 0.38;
      }
      void main() {
        vec2 p = vWorld.xz * scale;
        float d = density(p);
        float alpha = smoothstep(1.0 - cover - 0.06, 1.0 - cover + 0.12, d);
        // Lit toward the moon, and brighter where the cloud is thick.
        vec3 toward = normalize(vec3(vWorld.x, 0.0, vWorld.z) + 1e-4);
        vec2 moonFlat = normalize(vec2(moon.x, moon.z) + 1e-4);
        float moonward = dot(toward, vec3(moonFlat.x, 0.0, moonFlat.y)) * 0.5 + 0.5;
        // The relief: the side of each swell that faces the moon catches it.
        float slope = (d - density(p + moonFlat * 0.035)) * 9.0;
        float light = clamp((d - (1.0 - cover)) * 2.4 + 0.15 + slope * relief, 0.0, 1.0);
        light *= 0.35 + 0.65 * moonward;
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
  /** Sculpted billows (a lumpy sphere with a moonlit rim, sorted far to near) instead of soft mist. */
  billow?: boolean;
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

function billowMaterial(opacity: number) {
  return new ShaderMaterial({
    uniforms: {
      noise: { value: noiseTexture() },
      time: { value: 0 },
      body: { value: BILLOW.body },
      rim: { value: BILLOW.rim },
      shade: { value: BILLOW.shade },
      opacity: { value: opacity },
      moon: { value: MOON_DIRECTION },
      haze: { value: HAZE },
      fade: { value: [BILLOW_FADE.near, BILLOW_FADE.far] },
      seaTop: { value: SEA_TOP },
    },
    vertexShader: /* glsl */ `
      uniform vec3 moon;
      uniform vec2 fade;
      attribute vec4 puff;
      varying vec2 vUv;
      varying float vSeed;
      varying float vMoonward;
      varying float vFar;
      varying vec3 vMoonView;
      varying float vWorldY;
      void main() {
        vUv = uv;
        vSeed = fract(puff.x * 0.137 + puff.z * 0.071);
        vec2 flat_ = normalize(puff.xz + 1e-4);
        vMoonward = dot(flat_, normalize(moon.xz)) * 0.5 + 0.5;
        vFar = smoothstep(fade.x, fade.y, distance(puff.xyz, cameraPosition));
        vMoonView = normalize(mat3(viewMatrix) * moon);
        vec4 view = viewMatrix * vec4(puff.xyz, 1.0);
        view.xy += position.xy * puff.w;
        vWorldY = puff.y + position.y * puff.w;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D noise;
      uniform float time;
      uniform vec3 body;
      uniform vec3 rim;
      uniform vec3 shade;
      uniform vec3 haze;
      uniform float opacity;
      uniform float seaTop;
      varying vec2 vUv;
      varying float vSeed;
      varying float vMoonward;
      varying float vFar;
      varying vec3 vMoonView;
      varying float vWorldY;
      void main() {
        vec2 c = (vUv - 0.5) * 2.0;
        vec2 drift = vec2(time * 0.004, 0.0);
        float n1 = texture2D(noise, vUv * 0.7 + vSeed + drift).r;
        float n2 = texture2D(noise, vUv * 1.9 + vSeed * 1.7 - drift).r;
        // A lumpy outline: cauliflower lobes round the edge.
        float edge = 0.86 + (n1 - 0.5) * 0.32 + (n2 - 0.5) * 0.18;
        float r = length(c) / edge;
        if (r > 1.0) discard;
        vec3 n = vec3(c / edge, sqrt(max(1.0 - r * r, 0.0)));
        n = normalize(n + vec3(n2 - 0.5, n1 - 0.5, 0.0) * 0.7);
        vec3 l = normalize(vMoonView);
        float diffuse = clamp(dot(n, l) * 0.55 + 0.45, 0.0, 1.0);
        float top = clamp(n.y * 0.6 + 0.4, 0.0, 1.0);
        vec3 color = mix(shade, body, top * 0.55 + diffuse * 0.45);
        // The moonlit rim, on the edge that faces the moon.
        float facing = clamp(dot(normalize(n.xy + 1e-4), normalize(l.xy + 1e-4)) * 0.5 + 0.5, 0.0, 1.0);
        float rimLight = pow(1.0 - n.z, 2.2) * facing * facing;
        color += rim * rimLight * (0.45 + 0.75 * vMoonward);
        color += rim * pow(diffuse, 6.0) * 0.18;
        color = mix(color, haze, vFar * 0.55);
        // Feet sink into the sea; soft only right at the outline.
        float foot = smoothstep(seaTop - 0.6, seaTop + 1.4, vWorldY);
        float a = smoothstep(1.0, 0.9, r) * foot * opacity * (1.0 - vFar * 0.3);
        gl_FragColor = vec4(color, a);
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}

const sortScratch = new Vector3();

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

export function Puffs({ puffs, lit, shade, opacity, billow = false }: PuffSet) {
  const geometry = useMemo(() => {
    const g = instancedQuad(1, 1, puffs.length);
    g.setAttribute('puff', new InstancedBufferAttribute(new Float32Array(puffs.flat()), 4));
    return g;
  }, [puffs]);
  const material = useMemo(
    () => (billow ? billowMaterial(opacity) : puffMaterial(lit, shade, opacity)),
    [billow, lit, shade, opacity]
  );
  const order = useMemo(() => puffs.map((_, i) => i), [puffs]);
  useFrame(({ camera }) => {
    material.uniforms.time.value = island.flow;
    if (!billow) return;
    // Billows are near opaque: draw them far to near so the nearer ones cover.
    const depth = (i: number) => {
      const [x, y, z] = puffs[i];
      return sortScratch.set(x, y, z).distanceToSquared(camera.position);
    };
    order.sort((a, b) => depth(b) - depth(a));
    const attribute = geometry.getAttribute('puff') as InstancedBufferAttribute;
    const array = attribute.array as Float32Array;
    order.forEach((from, to) => array.set(puffs[from], to * 4));
    attribute.needsUpdate = true;
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

/** Billows ringed round the rock where the top sheets cut through it. */
function ringPuffs(): PuffSet['puffs'] {
  const rand = seeded(7);
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < 34; i++) {
    const angle = (i / 34) * Math.PI * 2 + rand() * 0.3;
    const radius = 6 + rand() * 5;
    const size = 3.2 + rand() * 3.4;
    out.push([
      Math.cos(angle) * radius,
      SEA_TOP + size * 0.18 - rand() * 1.2,
      Math.sin(angle) * radius,
      size,
    ]);
  }
  return out;
}

/**
 * Heaps of billows across the whole sea, larger with distance: a few lobes
 * each, the middle ones tallest, so the tops read as sculpted cloud rising out
 * of the sea rather than a flat layer at a grazing view.
 */
function seaPuffs(): PuffSet['puffs'] {
  const rand = seeded(23);
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < 40; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 16 + Math.pow(rand(), 0.8) * 140;
    const heap = (5 + rand() * 6) * (0.6 + radius / 60);
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;
    const lobes = 4 + Math.floor(rand() * 3);
    for (let k = 0; k < lobes; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * heap * 0.75;
      const rise = 1 - d / heap;
      const size = heap * (0.42 + rand() * 0.3) * (0.7 + rise * 0.3);
      out.push([
        cx + Math.cos(a) * d,
        SEA_TOP + rise * heap * 0.22 + size * 0.05,
        cz + Math.sin(a) * d,
        size,
      ]);
    }
  }
  return out;
}

/**
 * A bank of big, low heaps out toward the horizon, so the far sea keeps rows
 * of billows instead of fading into flat haze at the pullback.
 */
function horizonPuffs(): PuffSet['puffs'] {
  const rand = seeded(57);
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2 + rand() * 0.18;
    const radius = 100 + rand() * 70;
    const heap = (9 + rand() * 7) * (radius / 60);
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius;
    const lobes = 5 + Math.floor(rand() * 3);
    for (let k = 0; k < lobes; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * heap * 0.8;
      const rise = 1 - d / heap;
      const size = heap * (0.36 + rand() * 0.26) * (0.7 + rise * 0.3);
      out.push([
        cx + Math.cos(a) * d,
        SEA_TOP + rise * heap * 0.16 + size * 0.04,
        cz + Math.sin(a) * d,
        size,
      ]);
    }
  }
  return out;
}

/** Billows round each far spire's waist, where the sheets cut through it. */
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
        SEA_TOP + 0.6 - rand() * 1.4,
        z + Math.sin(angle) * reach,
        (6 + rand() * 4) * scale[0],
      ]);
    }
  }
  return out;
}

const RING = [...ringPuffs(), ...spirePuffs()];
const SEA = [...seaPuffs(), ...horizonPuffs()];

export function Clouds() {
  const materials = useMemo(
    () => SHEETS.map(sheet => sheetMaterial(sheet.cover, sheet.opacity, sheet.scale, sheet.relief)),
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
      <Puffs puffs={SEA} lit={CLOUD_LIT} shade={CLOUD_SHADE} opacity={0.95} billow />
      <Puffs puffs={RING} lit={CLOUD_LIT} shade={CLOUD_SHADE} opacity={0.9} billow />
    </>
  );
}
