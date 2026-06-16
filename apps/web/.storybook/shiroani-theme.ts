import { create } from 'storybook/theming/create';

/*
 * ShiroAni-branded Storybook theme — mirrors the app's default "plum" dark
 * palette (src/styles/themes/plum.css, surfaced via globals.css). The app's
 * tokens are oklch; Storybook's theme API (emotion) takes plain color strings,
 * so each value below is the sRGB-hex equivalent of its oklch source (noted
 * inline). Shared by the manager chrome (manager.ts) and the Docs pages
 * (preview.tsx → parameters.docs.theme) so the whole tool reads as ShiroAni.
 */

// Brand accent — the plum/pink primary: oklch(0.74 0.15 355) and its -0.1L hover.
const pink = '#f37fb0';
const pinkDeep = '#d06091';

// Plum surfaces / ink (oklch hue 300).
const bg = '#07050b'; // oklch(0.12 0.018 300) — window background
const surface = '#0f0b16'; // oklch(0.16 0.025 300) — cards & chrome bars
const ink = '#f3f0f8'; // oklch(0.96 0.01 300) — primary text
const inkMuted = '#a7a1b5'; // oklch(0.72 0.03 300) — secondary text
const line = '#221f29'; // white/8% over surface — borders

export const shiroaniTheme = create({
  base: 'dark',

  brandTitle: 'ShiroAni',
  // The chibi mascot, served at the Storybook root from apps/web/public — by
  // Vite's publicDir middleware in `storybook dev` and copied into the bundle by
  // `storybook build`, so it resolves in both dev and the deployed static build.
  brandImage: '/shiro-chibi.svg',
  brandTarget: '_self',

  colorPrimary: pink,
  colorSecondary: pink,

  appBg: surface,
  appContentBg: bg,
  appPreviewBg: bg,
  appBorderColor: line,
  appBorderRadius: 10,

  textColor: ink,
  textInverseColor: bg,
  textMutedColor: inkMuted,

  barBg: surface,
  barTextColor: inkMuted,
  barSelectedColor: pink,
  barHoverColor: pinkDeep,

  inputBg: bg,
  inputBorder: line,
  inputTextColor: ink,
  inputBorderRadius: 8,

  fontBase: "'DM Sans Variable', 'DM Sans', system-ui, sans-serif",
  fontCode: "'JetBrains Mono Variable', 'JetBrains Mono', Consolas, monospace",
});
