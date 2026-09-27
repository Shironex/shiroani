// README, portfolio and hero images for ShiroAni, captured with
// @noctcore/showcase-kit. Regenerate everything with `pnpm showcase`.
//
// The capture runs the web renderer alone, without Electron or the NestJS
// backend: `vite build --mode showcase` boots through
// apps/web/src/showcase/entry.ts, which installs a fake window.electronAPI and
// swaps socket.io-client for an in-memory fixture socket. All data shown
// (titles, covers, the profile, diary, feed and shortcuts) is invented in
// apps/web/src/showcase/fixtures. No other build mode includes any of it.
//
// Determinism: the clock is frozen to a Sunday evening, every request outside
// the local preview server is blocked, theme and language are seeded before a
// reload, and the kit itself disables animations and waits for fonts.
//
// Outputs:
// - assets/screenshots/<lang>/<id>.png: plain captures. Committed on purpose:
//   apps/landing-demo's Remotion reel renders them, so do not treat this folder
//   as scratch output.
// - assets/showcase/<lang>/<id>.webp: framed images for README.md and README.pl.md.
// - assets/showcase/hero.<lang>.webp: README banners, one per language
//   (scripts/showcase-extras.mjs, which also prints the README tables).
// - ../portfolio/public/projects/shiroani: portfolio export (webp).
import { defineConfig } from '@noctcore/showcase-kit';

const PORT = 15180;
const ORIGIN = `http://localhost:${PORT}`;

/** Sunday 2026-09-27, 19:00 local time: the new tab greets with "evening". */
const FROZEN_NOW = new Date(2026, 8, 27, 19, 0, 0);

/**
 * Polish captions and tagline for README.pl.md and the Polish hero. The kit
 * keeps one caption per shot, so scripts/showcase-extras.mjs swaps these in.
 */
export const LOCALIZED = {
  pl: {
    tagline: 'Twój przytulny kącik dla wszystkiego, co anime.',
    shots: {
      library: { title: 'Biblioteka', caption: 'Wszystko, co oglądasz, na jednej półce.' },
      discover: {
        title: 'Odkrywaj',
        caption: 'Popularne, sezonowe i losowe anime, prosto z AniList.',
      },
      diary: { title: 'Dziennik', caption: 'Osobisty dziennik z edytorem tekstu.' },
      schedule: {
        title: 'Harmonogram',
        caption: 'Odcinki emitowane w tym tygodniu w jednym miejscu.',
      },
      feed: {
        title: 'Aktualności',
        caption: 'Wiadomości i nowe odcinki, po angielsku i po polsku.',
      },
      profile: { title: 'Profil', caption: 'Twoje statystyki AniList i ostatnia aktywność.' },
      changelog: { title: 'Historia', caption: 'Co nowego, prosto z historii wydań.' },
      browser: {
        title: 'Przeglądarka',
        caption: 'Nowa karta bez reklam, z Twoimi skrótami.',
      },
      settings: {
        title: 'Ustawienia',
        caption: 'Siedemnaście motywów, edytor wizualny i nie tylko.',
      },
    },
  },
};

const BACKGROUND = { type: 'gradient', from: '#d46cb1', to: '#1a1323', angle: 135 };

/**
 * Click a dock item (and optionally a tab inside the view, matched by its label
 * in either language), then park the mouse where it leaves no hover state.
 */
function openView(view, tab) {
  return async page => {
    await page.locator(`[data-view="${view}"]`).first().click();
    if (tab) await page.getByRole('tab', { name: tab }).first().click();
    await page.mouse.move(0, 0);
  };
}

export default defineConfig({
  name: 'ShiroAni',
  slug: 'shiroani',
  target: {
    mode: 'url',
    url: ORIGIN,
    start: `pnpm exec vite build --mode showcase --outDir dist-showcase && pnpm exec vite preview --outDir dist-showcase --port ${PORT} --strictPort`,
    cwd: 'apps/web',
    readyTimeoutMs: 180000,
    reuseExisting: false,
  },
  // The strict marker ([data-testid="app-ready"]) only exists once onboarding
  // is done, which setup() seeds; before that the splash or the wizard shows.
  ready: '#root > *',
  viewport: { width: 1122, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  langs: ['en', 'pl'],
  setup: async ({ page, context, lang }) => {
    await context.route(
      url => !url.href.startsWith(ORIGIN) && !url.href.startsWith('data:'),
      route => route.abort()
    );
    await page.clock.setFixedTime(FROZEN_NOW);
    await page.evaluate(language => {
      localStorage.clear();
      localStorage.setItem('shiroani.language', language);
      localStorage.setItem('shiroani-theme', 'plum');
      localStorage.setItem('onboarding-completed', 'true');
      localStorage.setItem('support-banner-seen', 'true');
      localStorage.setItem('shiroani:displayName', 'Mochiko');
    }, lang);
    await page.reload({ waitUntil: 'load' });
    await page.locator('[data-testid="app-ready"]').waitFor({ state: 'attached', timeout: 60000 });
  },
  shots: [
    {
      id: 'library',
      title: 'Library',
      caption: "Everything you're watching, tracked in one shelf.",
      nav: openView('library'),
      waitFor: 'text=Snowfield Signal >> visible=true',
    },
    {
      id: 'discover',
      title: 'Discover',
      caption: 'Trending, popular and seasonal anime, powered by AniList.',
      nav: openView('discover'),
      waitFor: 'text=Summer Cicada Radio >> visible=true',
    },
    {
      id: 'diary',
      title: 'Diary',
      caption: 'A personal journal with a rich-text editor.',
      nav: openView('diary'),
      waitFor: 'text=Snowfield Signal >> visible=true',
    },
    {
      id: 'schedule',
      title: 'Schedule',
      caption: "The week's airing episodes, at a glance.",
      nav: openView('schedule'),
      waitFor: 'text=Tsukiakari Rire >> visible=true',
    },
    {
      id: 'feed',
      title: 'News',
      caption: 'Anime news and episode drops, English and Polish.',
      nav: openView('feed'),
      waitFor: 'text=Hoshi News Desk >> visible=true',
    },
    {
      id: 'profile',
      title: 'Profile',
      caption: 'Your AniList stats and recent activity.',
      nav: openView('profile'),
      waitFor: 'text=Studio Kumoji >> visible=true',
    },
    {
      id: 'changelog',
      title: 'Changelog',
      caption: "What's new, straight from the release history.",
      nav: openView('changelog'),
      waitFor: String.raw`text=/^v\d+\.\d+\.\d+$/ >> visible=true`,
    },
    {
      id: 'browser',
      title: 'Browser',
      caption: 'An ad-free new tab with your own shortcuts.',
      nav: openView('browser'),
      waitFor: 'text=Kumo Stream >> visible=true',
    },
    {
      id: 'settings',
      title: 'Settings',
      caption: 'Seventeen themes, a visual editor, and more.',
      nav: openView('settings', /^(Themes|Motywy)$/),
      waitFor: '[data-testid="plum-mode-button"] >> visible=true',
    },
  ],
  frame: {
    // The capture already shows the app's own title bar, so no second window frame.
    style: 'none',
    theme: 'dark',
    background: BACKGROUND,
    padding: 72,
    radius: 14,
    shadow: true,
    maxWidth: 1800,
  },
  hero: {
    tagline: 'Your cozy little corner for all things anime.',
    logo: 'assets/icon.png',
    shots: ['library', 'schedule', 'profile'],
    lang: 'en',
    output: 'assets/showcase/hero.{lang}.webp',
    background: BACKGROUND,
    theme: 'dark',
  },
  outputs: {
    raw: 'assets/screenshots/{lang}/{id}.png',
    readme: 'assets/showcase/{lang}/{id}.webp',
    portfolio: {
      dir: '../portfolio/public/projects/{slug}',
      size: [1920, 1080],
      format: 'webp',
      thumbnail: 'library',
      lang: 'en',
      gallery: false,
    },
  },
});
