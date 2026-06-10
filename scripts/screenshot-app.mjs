#!/usr/bin/env node
/**
 * Attach to a running ShiroAni Electron app via CDP and screenshot every
 * top-level view in every supported UI language.
 *
 * Pre-req: launch the app with the renderer + main both reachable via CDP, e.g.
 *
 *   pnpm dev:web                                                # terminal 1
 *   cd apps/desktop && electron . --remote-debugging-port=9222  # terminal 2
 *
 * Output: assets/screenshots/<lang>/<view>.png
 *         assets/screenshots/<lang>/<view>.webp (READMEs embed these; PNGs stay
 *         canonical for the Remotion demo reel in apps/landing-demo)
 */
const PW = process.env.PLAYWRIGHT_PATH ?? 'playwright';
const { chromium } = await import(PW);
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// sharp lives in apps/landing's devDependencies — borrow it from there.
let sharp = null;
try {
  sharp = createRequire(resolve(process.cwd(), 'apps/landing/package.json'))('sharp');
} catch {
  console.warn('sharp not resolvable from apps/landing — .webp variants will be stale.');
}

const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const OUT_ROOT = resolve(process.cwd(), 'assets/screenshots');

// Keep in sync with packages/shared/src/i18n/index.ts
const LANGUAGE_STORAGE_KEY = 'shiroani.language';
const UI_LANGUAGE_SETTING_KEY = 'app.uiLanguage';
const LANGUAGES = (process.env.LANGS ?? 'en,pl').split(',').map(s => s.trim()).filter(Boolean);

// Views worth capturing — ordered like the navigation dock, ending on settings.
// `browser` is intentionally skipped (its content is third-party).
const VIEWS = [
  'library',
  'discover',
  'diary',
  'schedule',
  'feed',
  'profile',
  'changelog',
  'browser',
  'settings',
];

const browser = await chromium.connectOverCDP(CDP);
const context = browser.contexts()[0];
const page =
  context.pages().find(p => p.url().startsWith('http://localhost:15174')) ??
  context.pages().find(p => !p.url().startsWith('devtools://'));

if (!page) {
  console.error('no renderer page found on CDP — is the app running with --remote-debugging-port=9222?');
  process.exit(1);
}

console.log('attached to:', page.url(), '·', await page.title());

async function waitForReady() {
  await page.waitForLoadState('domcontentloaded');
  // App marks itself ready with data-testid="app-ready" once splash + onboarding clear.
  await page.locator('[data-testid="app-ready"]').waitFor({ timeout: 30_000 });
  // Tiny settle so dock animations / theme transitions finish before the shutter.
  await page.waitForTimeout(400);
}

async function setLanguage(lang) {
  console.log(`\n── switching UI to "${lang}" ─────────────────────`);
  await page.evaluate(
    async ({ lang, lsKey, storeKey }) => {
      window.localStorage.setItem(lsKey, lang);
      try {
        await window.electronAPI?.store?.set?.(storeKey, lang);
      } catch {
        // electron-store mirror is best-effort; localStorage drives the boot.
      }
    },
    { lang, lsKey: LANGUAGE_STORAGE_KEY, storeKey: UI_LANGUAGE_SETTING_KEY }
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForReady();
}

async function navigate(viewId) {
  const btn = page.locator(`[data-view="${viewId}"]`).first();
  await btn.waitFor({ timeout: 5_000 });
  await btn.click();
  // Views fade-in / fetch initial data — wait a beat before the shot.
  await page.waitForTimeout(700);

  // Browser view shows whatever tab is active. Force-open a fresh new tab
  // so the screenshot consistently captures the curated NewTabPage instead
  // of whatever site the user happens to have open.
  if (viewId === 'browser') {
    try {
      await page.locator('[data-testid="browser-new-tab"]').first().click({ timeout: 3_000 });
      await page.waitForTimeout(600);
    } catch {
      // ignore — best-effort
    }
  }
}

async function shot(lang, view) {
  const dir = resolve(OUT_ROOT, lang);
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${view}.png`);
  await page.screenshot({ path: file });
  console.log('  ->', file);
  if (sharp) {
    const webp = resolve(dir, `${view}.webp`);
    await sharp(file).webp({ quality: 85 }).toFile(webp);
    console.log('  ->', webp);
  }
}

await waitForReady();

// Temporarily reveal every view in the dock so we can screenshot views the
// user has hidden (e.g. diary / changelog). Restore after the run.
const DOCK_KEY = 'dock-settings';
const originalDock = await page.evaluate(async key => {
  const current = await window.electronAPI?.store?.get?.(key);
  await window.electronAPI?.store?.set?.(key, { ...(current ?? {}), hiddenViews: [] });
  return current ?? null;
}, DOCK_KEY);

try {
  for (const lang of LANGUAGES) {
    await setLanguage(lang);
    for (const view of VIEWS) {
      try {
        await navigate(view);
        await shot(lang, view);
      } catch (e) {
        console.warn(`  skip ${lang}/${view}:`, e.message);
      }
    }
  }
} finally {
  await page.evaluate(
    async ({ key, value }) => {
      if (value === null) {
        await window.electronAPI?.store?.delete?.(key);
      } else {
        await window.electronAPI?.store?.set?.(key, value);
      }
    },
    { key: DOCK_KEY, value: originalDock }
  );
  console.log('\nrestored original dock-settings.');
}

// Disconnect — do NOT close the page, that would kill Electron.
await browser.close();
console.log('\ndone.');
