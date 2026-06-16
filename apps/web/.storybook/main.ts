import type { StorybookConfig } from '@storybook/react-vite';

/**
 * The Vite builder auto-merges `apps/web/vite.config.ts`, so the `@` /
 * `@shiroani/*` aliases, the React plugin, and the Tailwind v4 plugin are all
 * inherited — no `viteFinal` override needed. Tailwind scans the tokens via
 * `.storybook/preview.css`.
 */
const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-themes',
    '@storybook/addon-a11y',
    '@storybook/addon-vitest',
  ],
  core: { disableTelemetry: true },
  // The brand logo is the square chibi mascot; Storybook otherwise renders
  // brandImage up to ~100px tall, which dominates the sidebar. Cap it to a
  // sidebar-appropriate height (inline brand styles need !important to beat).
  managerHead: head =>
    `${head}<style>.sidebar-header img, img[alt='ShiroAni'] { max-height: 44px !important; width: auto !important; }</style>`,
};

export default config;
