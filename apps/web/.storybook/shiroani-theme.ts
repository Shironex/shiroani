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

/*
 * Logo: an inline SVG wordmark — a five-petal sakura in the brand pink next to
 * a two-tone "ShiroAni". Kept as a readable template string and URL-encoded into
 * a data URI at load, so there is no static asset to copy or serve. (To use the
 * chibi mascot instead, point brandImage at a served PNG — see manager docs.)
 */
const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="124" height="32" viewBox="0 0 124 32" fill="none"><g transform="translate(16 16)"><g fill="${pink}"><ellipse cx="0" cy="-6.6" rx="4.3" ry="6.8"/><ellipse cx="0" cy="-6.6" rx="4.3" ry="6.8" transform="rotate(72)"/><ellipse cx="0" cy="-6.6" rx="4.3" ry="6.8" transform="rotate(144)"/><ellipse cx="0" cy="-6.6" rx="4.3" ry="6.8" transform="rotate(216)"/><ellipse cx="0" cy="-6.6" rx="4.3" ry="6.8" transform="rotate(288)"/></g><circle r="2.8" fill="#fbd5e4"/></g><text x="38" y="21" font-family="DM Sans,system-ui,sans-serif" font-size="17" font-weight="700" letter-spacing="-0.2"><tspan fill="${ink}">Shiro</tspan><tspan fill="${pink}">Ani</tspan></text></svg>`;

export const shiroaniTheme = create({
  base: 'dark',

  brandTitle: 'ShiroAni',
  brandImage: `data:image/svg+xml,${encodeURIComponent(logo)}`,
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
