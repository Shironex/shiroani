/**
 * Render the landing demo reel in both locales, into H.264 MP4 plus a
 * JPEG + AVIF poster. Output lands directly in the landing site's public
 * folder so Astro picks it up on next build.
 *
 * We used to also emit VP9 WebM, but Remotion's VP9 encoder produced
 * containers with invalid stream metadata (level: -99, color_range: pc,
 * color_space: bt470bg) that Chrome refused to decode. MP4/H.264 plays
 * in every browser including iOS Safari, so we kept the simple path.
 *
 * Usage:
 *   pnpm --filter @shiroani/landing-demo render
 *   pnpm --filter @shiroani/landing-demo render -- --lang=en   # single locale
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';
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

// Explicit allow-list so that --lang=de errors immediately rather than
// silently rendering Polish content into shiroani-demo.de.mp4.
const COMP_IDS = { en: 'DemoReelEn', pl: 'DemoReelPl' };
const SUPPORTED = Object.keys(COMP_IDS);

if (langArg && !SUPPORTED.includes(langArg)) {
  console.error(`[demo-reel] unsupported --lang=${langArg}. Supported: ${SUPPORTED.join(', ')}`);
  process.exit(1);
}

const LANGS = langArg ? [langArg] : SUPPORTED;

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
    const compId = COMP_IDS[lang];
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
      // muted: true skips the audio track entirely.
      muted: true,
      chromiumOptions: { gl: 'swangle' },
    });

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

    // Post-process poster to AVIF for browsers that support it.
    // <video poster> only accepts a single URL so Demo.astro keeps the JPG
    // as the poster= value; the AVIF sits alongside for future picture-based
    // overlays or once browsers support AVIF in poster= more broadly.
    const avifOut = path.join(outDir, `shiroani-demo.${lang}.avif`);
    console.log(`[demo-reel] converting poster → AVIF ${avifOut}`);
    await sharp(posterOut).avif({ quality: 50 }).toFile(avifOut);
  }

  console.log('[demo-reel] done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
