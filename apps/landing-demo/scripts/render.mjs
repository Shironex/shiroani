/**
 * Render the landing demo reel in both locales, into both H.264 MP4 and
 * VP9 WebM, plus a poster JPEG. Output lands directly in the landing
 * site's public folder so Astro picks it up on next build.
 *
 * Usage:
 *   pnpm --filter @shiroani/landing-demo render
 *   pnpm --filter @shiroani/landing-demo render -- --lang=en   # single locale
 *   pnpm --filter @shiroani/landing-demo render -- --quick      # skip webm
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { bundle } from '@remotion/bundler';
import {
  getCompositions,
  renderMedia,
  renderStill,
  selectComposition,
} from '@remotion/renderer';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const publicDir = path.resolve(root, '../../assets');
const outDir = path.resolve(root, '../landing/public/demo');

const args = new Set(process.argv.slice(2));
const langArg = [...args].find((a) => a.startsWith('--lang='))?.split('=')[1];
const quick = args.has('--quick');

const LANGS = langArg ? [langArg] : ['en', 'pl'];

async function main() {
  await mkdir(outDir, { recursive: true });

  console.log('[demo-reel] bundling…');
  const serveUrl = await bundle({
    entryPoint: path.resolve(root, 'src/index.ts'),
    publicDir,
    webpackOverride: (c) => c,
  });

  const compositions = await getCompositions(serveUrl);

  for (const lang of LANGS) {
    const compId = lang === 'en' ? 'DemoReelEn' : 'DemoReelPl';
    const composition = compositions.find((c) => c.id === compId);
    if (!composition) {
      throw new Error(`Composition ${compId} not found`);
    }

    const mp4Out = path.join(outDir, `shiroani-demo.${lang}.mp4`);
    console.log(`[demo-reel] rendering MP4 → ${mp4Out}`);
    await renderMedia({
      composition,
      serveUrl,
      codec: 'h264',
      outputLocation: mp4Out,
      crf: 20,
      pixelFormat: 'yuv420p',
      x264Preset: 'slow',
      audioCodec: null,
      chromiumOptions: { gl: 'swangle' },
    });

    if (!quick) {
      const webmOut = path.join(outDir, `shiroani-demo.${lang}.webm`);
      console.log(`[demo-reel] rendering WebM → ${webmOut}`);
      await renderMedia({
        composition,
        serveUrl,
        codec: 'vp9',
        outputLocation: webmOut,
        crf: 32,
        audioCodec: null,
        chromiumOptions: { gl: 'swangle' },
      });
    }

    const posterOut = path.join(outDir, `shiroani-demo.${lang}.jpg`);
    console.log(`[demo-reel] rendering poster → ${posterOut}`);
    const stillComp = await selectComposition({
      serveUrl,
      id: compId,
    });
    await renderStill({
      composition: stillComp,
      serveUrl,
      output: posterOut,
      // Pick a frame deep into the first screenshot scene so the poster
      // shows actual UI (not the intro title card).
      frame: 100,
      imageFormat: 'jpeg',
      jpegQuality: 80,
      chromiumOptions: { gl: 'swangle' },
    });
  }

  console.log('[demo-reel] done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
