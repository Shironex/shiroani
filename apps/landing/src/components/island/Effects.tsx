import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

/**
 * One composer pass over the island: bloom on what glows past white (the
 * lanterns, the vending machine, the shop windows, the moon), AgX tone mapping
 * (the composer takes it over from the renderer), a soft vignette and a little
 * moving grain under the page's own static grain.
 */
export function Effects({ multisampling }: { multisampling: number }) {
  return (
    // Multisampled here, so the canvas itself runs without antialiasing.
    <EffectComposer multisampling={multisampling}>
      {/* Only HDR values bloom: emissive parts are pushed past 1, the rest stays under. */}
      <Bloom
        mipmapBlur
        luminanceThreshold={1}
        luminanceSmoothing={0.25}
        intensity={0.6}
        radius={0.65}
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.35} darkness={0.5} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
    </EffectComposer>
  );
}
