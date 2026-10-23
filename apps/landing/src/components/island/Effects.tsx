import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { BlendFunction, Effect, ToneMappingMode } from 'postprocessing';
import { useMemo } from 'react';
import { Color, Uniform } from 'three';
import { near } from './progress';
import { ISLAND_STOPS } from './stops';

/**
 * The moon stop is the page's warm goodbye (concept 6b): the grade lifts it
 * by this much and turns its lights toward lantern gold, easing in with the
 * scroll.
 */
const MOON_GRADE = { lift: 1.35, warm: new Color(1.1, 1.03, 0.78) } as const;
const MOON_STOP = ISLAND_STOPS.findIndex(stop => stop.id === 'moon');
const NEUTRAL = new Color(1, 1, 1);

/**
 * The colour grade, after tone mapping: a touch more saturation, the shadows
 * lifted toward plum so the night never goes black, and the light end warmed
 * toward lantern gold, like the concepts' glow. Skin and hair sit in the
 * middle, where neither tint reaches far, so Shiro-chan keeps her colours.
 * `lift` and `warm` brighten and warm a stop on top (MOON_GRADE).
 */
class GradeEffect extends Effect {
  constructor() {
    super(
      'GradeEffect',
      /* glsl */ `
        uniform vec3 shadowTint;
        uniform vec3 lightTint;
        uniform float saturation;
        uniform float lift;
        uniform vec3 warm;
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          vec3 c = inputColor.rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, saturation);
          c += shadowTint * (1.0 - smoothstep(0.0, 0.3, l));
          c *= mix(vec3(1.0), lightTint, smoothstep(0.3, 0.85, l));
          c *= lift * mix(vec3(1.0), warm, smoothstep(0.04, 0.6, l));
          outputColor = vec4(c, inputColor.a);
        }
      `,
      {
        uniforms: new Map<string, Uniform>([
          ['shadowTint', new Uniform(new Color(0.022, 0.008, 0.03))],
          ['lightTint', new Uniform(new Color(1.06, 0.98, 0.9))],
          ['saturation', new Uniform(1.12)],
          ['lift', new Uniform(1)],
          ['warm', new Uniform(new Color(1, 1, 1))],
        ]),
      }
    );
  }
}

/**
 * One composer pass over the island: bloom on what glows past white (the
 * lanterns, the vending machine, the shop windows and sign, the moon), AgX
 * tone mapping (the composer takes it over from the renderer), the grade, a
 * soft vignette and a little moving grain under the page's own static grain.
 */
export function Effects({ multisampling }: { multisampling: number }) {
  const grade = useMemo(() => new GradeEffect(), []);
  useFrame(() => {
    const k = MOON_STOP === -1 ? 0 : near(MOON_STOP);
    (grade.uniforms.get('lift') as Uniform<number>).value = 1 + (MOON_GRADE.lift - 1) * k;
    (grade.uniforms.get('warm') as Uniform<Color>).value.lerpColors(NEUTRAL, MOON_GRADE.warm, k);
  });
  return (
    // Multisampled here, so the canvas itself runs without antialiasing.
    <EffectComposer multisampling={multisampling}>
      {/* Only HDR values bloom: emissive parts are pushed past 1, the rest stays under. */}
      <Bloom
        mipmapBlur
        luminanceThreshold={0.95}
        luminanceSmoothing={0.3}
        intensity={0.85}
        radius={0.7}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <primitive object={grade} dispose={null} />
      <Vignette offset={0.35} darkness={0.45} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
    </EffectComposer>
  );
}
