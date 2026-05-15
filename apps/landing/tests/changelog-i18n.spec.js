import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const layout = readFileSync(
  resolve(__dirname, '../src/layouts/BaseLayout.astro'),
  'utf8',
);

describe('ChangelogPage SSR/toggle consistency', () => {
  it('language toggle navigates to /en/changelog instead of in-place swap', () => {
    assert.match(layout, /\/en\/changelog/);
    assert.match(layout, /location\.(assign|href)/);
  });

  it('download route is also covered by the locale-sibling navigation map', () => {
    assert.match(layout, /\/en\/download/);
  });

  it('applyTranslations is still called for routes without a locale sibling', () => {
    assert.match(layout, /applyTranslations\(next\)/);
  });

  it('link-rewriter rewrites same-origin anchors toward /en/changelog for EN', () => {
    // Must contain a branch that rewrites pl → en (path === pl, lang === 'en', assign en)
    assert.match(layout, /rewriteLocalizedLinks/);
    // The shared localeRoutes constant must include both directions
    assert.match(layout, /\/changelog.*\/en\/changelog|\/en\/changelog.*\/changelog/s);
    assert.match(layout, /\/download.*\/en\/download|\/en\/download.*\/download/s);
  });

  it('link-rewriter is called from applyTranslations so it re-runs on every toggle', () => {
    // rewriteLocalizedLinks must be called inside applyTranslations
    const applyFn = layout.slice(layout.indexOf('function applyTranslations'));
    const nextFnStart = applyFn.indexOf('\n      function ', 1);
    const applyBody = nextFnStart === -1 ? applyFn : applyFn.slice(0, nextFnStart);
    assert.match(applyBody, /rewriteLocalizedLinks\(/);
  });
});
