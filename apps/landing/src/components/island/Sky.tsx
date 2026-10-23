import { Billboard, Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  Color,
  MathUtils,
  ShaderMaterial,
  Vector3,
  type Group,
} from 'three';
import { motion } from './motion';
import { noiseTexture } from './noise';
import { CAMERA_FOLLOW_RATE, island, segment } from './progress';
import { ISLAND_STOPS, type Vec3 } from './stops';

// The night sky: a gradient dome that warms toward the moon, the big pink
// moon with its painted surface and soft halo, and the stars. All of it is
// drawn in code, nothing to download.

/**
 * Where the moonlight comes from: the moon's place at the first stop, low in
 * the west over the clouds past the porch's end. The moon itself moves with
 * the stops (stops.ts, `moon`), behind the torii at the pullback and the
 * schedule stop, but the live light stays put so the lit props never shift.
 */
export const MOON_AT: Vec3 = ISLAND_STOPS[0].moon.at;
/** Large in the sky, like the concepts: about 14 degrees across from the island. */
const MOON_RADIUS = 11;
/** The halo's quad, as a multiple of the moon's radius. */
const HALO_SCALE = 5.2;
/** The dome sits inside the camera's far plane (220). */
const DOME_RADIUS = 200;

/** Toward the moon as drawn this frame: the sky's glow and the clouds' rims follow it. */
export const MOON_DIRECTION = new Vector3(...MOON_AT).normalize();

const moonFrom = new Vector3();
const moonTo = new Vector3();
const moonGoal = new Vector3();

const domeMaterial = new ShaderMaterial({
  uniforms: {
    zenith: { value: new Color('#09061a') },
    horizon: { value: new Color('#2b1a45') },
    below: { value: new Color('#1a1230') },
    glow: { value: new Color('#ff7cc4') },
    moon: { value: MOON_DIRECTION },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 zenith;
    uniform vec3 horizon;
    uniform vec3 below;
    uniform vec3 glow;
    uniform vec3 moon;
    varying vec3 vDir;
    void main() {
      vec3 dir = normalize(vDir);
      vec3 color = mix(horizon, zenith, smoothstep(0.0, 0.6, dir.y));
      color = mix(color, below, smoothstep(0.0, -0.35, dir.y));
      float m = max(dot(dir, moon), 0.0);
      color += glow * (pow(m, 12.0) * 0.06 + pow(m, 60.0) * 0.22);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: BackSide,
  depthWrite: false,
  depthTest: false,
  fog: false,
});

const moonMaterial = new ShaderMaterial({
  uniforms: {
    noise: { value: noiseTexture() },
    light: { value: new Color('#ff5cb6').multiplyScalar(1.0) },
    dark: { value: new Color('#a02474').multiplyScalar(0.9) },
  },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewNormal;
    void main() {
      vNormal = normal;
      vViewNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D noise;
    uniform vec3 light;
    uniform vec3 dark;
    varying vec3 vNormal;
    varying vec3 vViewNormal;
    // Noise projected along the three axes, blended by the normal: no pole seams.
    float surface(vec3 n, float scale, float offset) {
      vec3 w = pow(abs(n), vec3(4.0));
      w /= w.x + w.y + w.z;
      return texture2D(noise, n.yz * scale + offset).r * w.x
        + texture2D(noise, n.xz * scale + offset).r * w.y
        + texture2D(noise, n.xy * scale + offset).r * w.z;
    }
    void main() {
      vec3 n = normalize(vNormal);
      float maria = smoothstep(0.42, 0.62, surface(n, 0.55, 0.1));
      float craters = smoothstep(0.5, 0.72, surface(n, 1.9, 0.37));
      float speckle = surface(n, 5.0, 0.71);
      vec3 color = mix(light, dark, maria * 0.75);
      color = mix(color, dark * 0.85, craters * 0.35);
      color *= 0.88 + speckle * 0.24;
      float rim = 1.0 - max(dot(normalize(vViewNormal), vec3(0.0, 0.0, 1.0)), 0.0);
      color *= 1.0 + rim * rim * 0.35;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  fog: false,
});

const haloMaterial = new ShaderMaterial({
  uniforms: { color: { value: new Color('#ff4fae') } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      // Radius in moon radii: the disc ends at 1.
      float r = length(vUv - 0.5) * 2.0 * ${HALO_SCALE.toFixed(1)};
      float a = exp(-(r - 1.0) * 1.6) * 0.5 + exp(-(r - 1.0) * 0.45) * 0.16;
      a *= smoothstep(0.85, 1.05, r) * smoothstep(${HALO_SCALE.toFixed(1)}, ${(HALO_SCALE * 0.7).toFixed(1)}, r);
      gl_FragColor = vec4(color * a, 1.0);
    }
  `,
  blending: AdditiveBlending,
  transparent: true,
  depthWrite: false,
  fog: false,
});

export function Sky() {
  return (
    <>
      <mesh material={domeMaterial} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[DOME_RADIUS, 32, 16]} />
      </mesh>
      <Stars
        radius={120}
        depth={40}
        count={2400}
        factor={4}
        saturation={0}
        fade
        speed={motion.reduced ? 0 : 0.4}
      />
      <Moon />
    </>
  );
}

/**
 * The moon and its halo, gliding between the stops' places: along the sky
 * (the direction turns, the distance and size blend) and eased like the
 * camera, so it moves while the view turns rather than on its own.
 */
function Moon() {
  const ref = useRef<Group>(null);
  const started = useRef(false);
  useFrame((_, delta) => {
    const moon = ref.current;
    if (!moon) return;
    const { i, blend } = segment(island.p, ISLAND_STOPS.length);
    const from = ISLAND_STOPS[i].moon;
    const to = ISLAND_STOPS[i + 1].moon;
    moonFrom.fromArray(from.at);
    moonTo.fromArray(to.at);
    const distance = MathUtils.lerp(moonFrom.length(), moonTo.length(), blend);
    moonGoal.lerpVectors(moonFrom.normalize(), moonTo.normalize(), blend).setLength(distance);
    const scale = MathUtils.lerp(from.scale, to.scale, blend);
    const follow =
      started.current && !motion.reduced ? 1 - Math.exp(-delta * CAMERA_FOLLOW_RATE) : 1;
    started.current = true;
    moon.position.lerp(moonGoal, follow);
    moon.scale.setScalar(MathUtils.lerp(moon.scale.x, scale, follow));
    MOON_DIRECTION.copy(moon.position).normalize();
  });
  return (
    <group ref={ref} position={MOON_AT}>
      <Billboard>
        <mesh material={haloMaterial} renderOrder={1}>
          <planeGeometry args={[MOON_RADIUS * HALO_SCALE * 2, MOON_RADIUS * HALO_SCALE * 2]} />
        </mesh>
      </Billboard>
      <mesh rotation={[0.3, 2.1, 0]} material={moonMaterial}>
        <sphereGeometry args={[MOON_RADIUS, 48, 32]} />
      </mesh>
    </group>
  );
}
