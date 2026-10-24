import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial } from 'three';
import { PLACEMENTS } from './placements';
import { island } from './progress';

// The shop signboard's lit face: a split-flap board of glowing pink cells,
// drawn by a shader on a quad laid over the sign panel (the baked sign keeps
// its frame and the noren). Now and then a cell flips, top flap falling.

/** The panel inside the sign's frame, relative to the sign's origin (from the Blender build). */
const PANEL = { y: 1.1, z: 0.1085, width: 2.46, height: 0.5 };
const CELLS = { x: 9, y: 2 };

const material = new ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    lit: { value: new Color('#ff77bd').multiplyScalar(1.15) },
    dim: { value: new Color('#f0509f').multiplyScalar(0.75) },
    frame: { value: new Color('#1b0f18') },
    cells: { value: [CELLS.x, CELLS.y] },
    aspect: { value: PANEL.width / PANEL.height },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float time;
    uniform vec3 lit;
    uniform vec3 dim;
    uniform vec3 frame;
    uniform vec2 cells;
    uniform float aspect;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      vec2 g = vUv * cells;
      vec2 id = floor(g);
      vec2 f = fract(g);
      // Bars between the cells, the same width across and down.
      vec2 bar = vec2(0.07, 0.07 * aspect * cells.y / cells.x);
      float inside = step(bar.x, f.x) * step(f.x, 1.0 - bar.x) * step(bar.y, f.y) * step(f.y, 1.0 - bar.y);
      float h = hash(id);
      // A soft glow, brighter in the middle of each cell, a little uneven across the board.
      vec2 c = (f - 0.5) * 2.0;
      float glow = 1.0 - dot(c, c) * 0.22;
      vec3 color = mix(dim, lit, 0.55 + 0.45 * h) * glow;
      // The split-flap seam across the middle of each cell.
      color *= 1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.035, abs(f.y - 0.5)));
      // Every so often the top flap falls: a dark band sweeps down the cell.
      float phase = fract(time * 0.06 + h * 7.0);
      float flip = smoothstep(0.0, 0.03, phase) * (1.0 - smoothstep(0.03, 0.06, phase));
      float sweep = 1.0 - phase / 0.06;
      color *= 1.0 - flip * 0.75 * step(f.y, sweep) * step(0.5, f.y);
      gl_FragColor = vec4(mix(frame, color, inside), 1.0);
    }
  `,
  fog: false,
});

const SIGN = PLACEMENTS.shop_sign[0];

export function ShopBoard() {
  useFrame(() => {
    material.uniforms.time.value = island.flow;
  });
  const [x, y, z] = SIGN.position;
  return (
    <mesh position={[x, y + PANEL.y, z + PANEL.z]} material={material}>
      <planeGeometry args={[PANEL.width, PANEL.height]} />
    </mesh>
  );
}
