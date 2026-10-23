import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, Effect, ToneMappingMode } from 'postprocessing';
import { useMemo } from 'react';
import { Color, Uniform } from 'three';

/**
 * The colour grade, after tone mapping: a touch more saturation, the shadows
 * lifted toward plum so the night never goes black, and the light end warmed
 * toward lantern gold, like the concepts' glow. Skin and hair sit in the
 * middle, where neither tint reaches far, so Shiro-chan keeps her colours.
 */
class GradeEffect extends Effect {
  constructor() {
    super(
      'GradeEffect',
      /* glsl */ `
        uniform vec3 shadowTint;
        uniform vec3 lightTint;
        uniform float saturation;
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          vec3 c = inputColor.rgb;
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, saturation);
          c += shadowTint * (1.0 - smoothstep(0.0, 0.3, l));
          c *= mix(vec3(1.0), lightTint, smoothstep(0.3, 0.85, l));
          outputColor = vec4(c, inputColor.a);
        }
      `,
      {
        uniforms: new Map<string, Uniform>([
          ['shadowTint', new Uniform(new Color(0.022, 0.008, 0.03))],
          ['lightTint', new Uniform(new Color(1.06, 0.98, 0.9))],
          ['saturation', new Uniform(1.12)],
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
