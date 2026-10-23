import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Color, DoubleSide, InstancedBufferAttribute, ShaderMaterial, Vector3 } from 'three';
import { instancedQuad, seeded } from './Clouds';
import { island } from './progress';

// Sakura petals drifting over the island: one instanced quad per petal, moved
// entirely in the vertex shader (falling, carried by the wind, fluttering), so
// the CPU does nothing per frame but set the time. The petals stand still
// under reduced motion, since the time does (progress.ts).

const COUNT = 320;
/** The box the petals drift through, wrapping round at its edges (metres). */
const BOX_MIN = new Vector3(-10, -2, -6);
const BOX_SIZE = new Vector3(20, 10, 16);
/** Petal length, metres. */
const SIZE = 0.075;
const PETAL = new Color('#ffb3d6');

const material = new ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    boxMin: { value: BOX_MIN },
    boxSize: { value: BOX_SIZE },
    color: { value: PETAL },
  },
  vertexShader: /* glsl */ `
    uniform float time;
    uniform vec3 boxMin;
    uniform vec3 boxSize;
    attribute vec4 seed;
    varying vec2 vUv;
    varying float vShade;
    void main() {
      vUv = uv;
      float speed = 0.55 + seed.w * 0.5;
      vec3 p = seed.xyz * boxSize;
      p.y -= time * 0.28 * speed;
      p.x += time * 0.42 * speed;
      p.z += time * 0.08;
      p = boxMin + mod(p, boxSize);
      p.x += sin(time * 0.8 + seed.w * 23.0) * 0.4;
      p.z += cos(time * 0.6 + seed.x * 31.0) * 0.3;
      // Flutter: spin in the petal's plane and tumble about its length.
      float spin = time * (0.7 + seed.w * 1.6) + seed.z * 6.283;
      float tumble = time * (1.1 + seed.y) + seed.x * 6.283;
      vec3 c = position * ${SIZE.toFixed(3)} * (0.75 + seed.w * 0.5);
      c.xy = mat2(cos(spin), -sin(spin), sin(spin), cos(spin)) * c.xy;
      c.yz = mat2(cos(tumble), -sin(tumble), sin(tumble), cos(tumble)) * c.yz;
      vShade = 0.72 + 0.28 * abs(cos(tumble));
      gl_Position = projectionMatrix * viewMatrix * vec4(p + c, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    varying vec2 vUv;
    varying float vShade;
    void main() {
      // A petal: an oval, narrower at the base, with a notch at the tip.
      vec2 q = vUv - 0.5;
      float w = 0.3 + 0.2 * (q.y + 0.5);
      if (abs(q.x) > w * sqrt(max(0.0, 1.0 - 4.0 * q.y * q.y))) discard;
      if (q.y > 0.38 && abs(q.x) < (q.y - 0.38) * 0.9) discard;
      gl_FragColor = vec4(color * vShade * (0.9 + 0.2 * vUv.y), 1.0);
    }
  `,
  side: DoubleSide,
});

export function Petals() {
  const geometry = useMemo(() => {
    const rand = seeded(11);
    const seeds = new Float32Array(COUNT * 4).map(() => rand());
    const g = instancedQuad(0.6, 1, COUNT);
    g.setAttribute('seed', new InstancedBufferAttribute(seeds, 4));
    return g;
  }, []);
  useFrame(() => {
    material.uniforms.time.value = island.flow;
  });
  return <mesh geometry={geometry} material={material} frustumCulled={false} />;
}
