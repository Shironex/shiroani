// @ts-check
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// URL.pathname on Windows returns `/P:/...` which Rollup's resolver rejects
// during `astro build`. fileURLToPath yields a clean platform-native absolute
// path that works in both dev (astro check) and production (astro build).
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://shiroani.app',
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'pl',
        locales: { pl: 'pl', en: 'en' },
      },
    }),
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
