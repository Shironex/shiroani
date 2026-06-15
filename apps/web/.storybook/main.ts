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
  addons: ['@storybook/addon-themes', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  core: { disableTelemetry: true },
};

export default config;
