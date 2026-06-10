// @ts-check
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// URL.pathname on Windows returns `/P:/...` which Rollup's resolver rejects
// during `astro build`. fileURLToPath yields a clean platform-native absolute
// path that works in both dev (astro check) and production (astro build).
const here = dirname(fileURLToPath(import.meta.url));

const google = fontProviders.google();

/**
 * Glyph repertoire for the two Japanese families (Zen Kaku, Shippori).
 * Google serves JP fonts as ~120 unicode-range chunks per weight and the
 * provider mislabels every chunk as subset "latin", so neither `subsets`
 * filtering nor preload filtering can tame them — inlining their @font-face
 * rules was ~500 KB of HTML per page. `experimental.glyphs` switches to the
 * `text=` API: one compact face per weight containing exactly these glyphs.
 * The set is deliberately broad for latin (full ASCII + Latin-1 + Latin
 * Extended-A) so any future PL/EN copy renders; characters outside it fall
 * back to the system font for that glyph only.
 */
/** @param {number} a @param {number} b */
const cpRange = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i));
const LATIN_GLYPHS = [
  ...cpRange(0x20, 0x7e), // printable ASCII
  ...cpRange(0xa0, 0xff), // Latin-1 supplement (é ü ° © × …)
  ...cpRange(0x100, 0x17f), // Latin Extended-A (all Polish diacritics)
  ...'’‘“”„…–—•·↗≡←→♥',
];
// Decorative kanji rendered in mincho: 白アニ, 白波, 綺麗漫画, 記録, ・
const JP_GLYPHS = [...'白アニ波綺麗漫画記録・'];

/**
 * The Fonts API `<Font preload>` filter matches on subset/weight/style only,
 * and the google provider mislabels the JP unicode-range chunks as subset
 * "latin" — so any granular preload for the JP display font floods the head
 * with 100+ CJK chunk preloads (~5 MB). This integration injects the precise
 * above-the-fold faces instead, identified by family + weight + the latin
 * unicode-range (U+0000-00FF) from the inlined @font-face CSS — which also
 * makes it robust to the hashed font file names changing between builds.
 */
// `markers` are unicode-range fingerprints. The glyph-subset families emit a
// single compact face whose range starts with the printable-ASCII block
// (U+20-7e), covering latin + Polish diacritics + the kanji in one file.
const ASCII = 'U+20-7e';
// Only the faces the LCP hero <h1> renders with — preloading more (body/mono)
// competes for bandwidth on throttled mobile and delays the h1's font, which
// is what finalizes LCP. Everything else swaps in via inline @font-face.
const PRELOAD_FACES = [
  { family: 'Zen Kaku Gothic New', weight: '900', markers: [ASCII] }, // hero h1
  { family: 'Shippori Mincho', weight: '800', markers: [ASCII] }, // italic accent word in the h1
];

/** @returns {import('astro').AstroIntegration} */
function fontPreloadFix() {
  return {
    name: 'font-preload-fix',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const { readdirSync, readFileSync, writeFileSync } = await import('node:fs');
        const { join } = await import('node:path');
        const root = fileURLToPath(dir);
        const htmlFiles = [];
        (function walk(d) {
          for (const e of readdirSync(d, { withFileTypes: true })) {
            if (e.isDirectory()) walk(join(d, e.name));
            else if (e.name.endsWith('.html')) htmlFiles.push(join(d, e.name));
          }
        })(root);

        // unicode-range is optional: glyph-subset families (text= API) emit a
        // single face per weight with no range — those match any marker.
        const faceRe =
          /@font-face\{font-family:"([^"]+)";src:url\("(\/_astro\/fonts\/[^"]+\.woff2)"\)[^}]*?(?:unicode-range:([^;]+);)?font-weight:([^;]+);font-style:(normal|italic);\}/g;

        for (const file of htmlFiles) {
          let html = readFileSync(file, 'utf8');
          // Strip any font preloads the <Font> component emitted.
          html = html.replace(
            /<link rel="preload" href="\/_astro\/fonts\/[^"]*" as="font"[^>]*>/g,
            ''
          );
          /** @type {string[]} */
          const links = [];
          for (const target of PRELOAD_FACES) {
            for (const marker of target.markers) {
              for (const m of html.matchAll(faceRe)) {
                const [, family, url, range, weight, style] = m;
                if (
                  family.startsWith(target.family) &&
                  weight === target.weight &&
                  style === 'normal' &&
                  (!range || range.includes(marker)) &&
                  !links.some(l => l.includes(url))
                ) {
                  links.push(
                    `<link rel="preload" href="${url}" as="font" type="font/woff2" crossorigin>`
                  );
                  break;
                }
              }
            }
          }
          html = html.replace('</head>', links.join('') + '</head>');
          writeFileSync(file, html);
        }
        logger.info(`injected font preloads into ${htmlFiles.length} pages`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://shiroani.app',
  integrations: [
    fontPreloadFix(),
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'pl',
        locales: { pl: 'pl', en: 'en' },
      },
    }),
  ],
  // Self-hosted fonts downloaded and subset at build time (no fonts.googleapis
  // / fonts.gstatic requests at runtime). The Fonts API is stable in Astro 6,
  // so this is a top-level `fonts` key (it was `experimental.fonts` in 5.x).
  // `cssVariable` reuses the exact names the stylesheets already consume
  // (`--font-display`, `--font-body`, `--font-mincho`, `--font-mono`) so
  // existing `var(--font-*)` usages keep working — the <Font> component owns
  // these variables now. `subsets` keeps the JP families split into
  // unicode-range chunks (latin + JP) so we never ship the multi-megabyte full
  // glyph set. Optimized fallbacks (size-adjust metrics) are on by default and
  // remove the swap reflow that caused CLS.
  fonts: [
    {
      provider: google,
      name: 'Zen Kaku Gothic New',
      cssVariable: '--font-display',
      // Only 700/800/900 are used with --font-display (800 synthesizes from
      // these). No JP glyph ever renders in the display font — all decorative
      // kanji use --font-mincho — so the glyph set is latin-only.
      weights: [700, 900],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      options: { experimental: { glyphs: LATIN_GLYPHS } },
      fallbacks: ['system-ui', 'sans-serif'],
      // The metric optimizer averages glyph widths across the FULL glyph set;
      // for JP fonts the full-width CJK glyphs inflate size-adjust to ~224%,
      // making the fallback render at 2.2x and the swap a huge layout shift.
      // Plain un-adjusted fallbacks shift far less.
      optimizedFallbacks: false,
      // `fallback` (100ms block, ~3s swap window): with the preload links the
      // font beats the window on normal connections; on very slow ones the
      // page keeps the fallback instead of repainting the hero late.
      display: 'fallback',
    },
    {
      provider: google,
      name: 'DM Sans',
      cssVariable: '--font-body',
      weights: [400, 500, 600, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: google,
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
    {
      provider: google,
      name: 'Shippori Mincho',
      cssVariable: '--font-mincho',
      // Only weight 800 is used (hero em, suite kanji, changelog kanji-bg).
      // The glyph set adds the decorative kanji on top of the latin base.
      weights: [800],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext', 'japanese'],
      options: { experimental: { glyphs: [...LATIN_GLYPHS, ...JP_GLYPHS] } },
      fallbacks: ['serif'],
      // Same ~218% size-adjust blowup as Zen Kaku — see above.
      optimizedFallbacks: false,
      display: 'fallback',
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@shiroani/shared': resolve(here, '../../packages/shared/src/index.ts'),
        '@shiroani/changelog': resolve(here, '../../packages/changelog/src/index.ts'),
        '@': resolve(here, './src'),
      },
    },
  },
});
