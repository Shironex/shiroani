import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { DARK_THEMES, LIGHT_THEMES } from '../../packages/shared/src/types/settings';

/**
 * Injects DARK_THEMES and LIGHT_THEMES from the shared package into index.html
 * so the inline pre-hydrate theme-detection script stays in sync with the
 * source of truth.
 */
function themeInjectionPlugin(): Plugin {
  return {
    name: 'shiroani-theme-injection',
    transformIndexHtml(html) {
      return html
        .replace('__DARK_THEMES__', JSON.stringify(DARK_THEMES))
        .replace('__LIGHT_THEMES__', JSON.stringify(LIGHT_THEMES));
    },
  };
}

/**
 * The meta CSP needs localhost in `connect-src` for Vite's dev server and HMR, and
 * is enforced in dev too, so the sources live in index.html and builds remove them.
 */
function stripDevConnectSources(): Plugin {
  return {
    name: 'shiroani-strip-dev-connect-sources',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(/ (?:http|ws):\/\/(?:localhost|127\.0\.0\.1):\*/g, '');
    },
  };
}

/**
 * `vite build --mode showcase` only: boots the renderer through
 * `src/showcase/entry.ts`, which installs a fake `window.electronAPI` answering
 * from fixtures, and replaces the built-in new-tab shortcuts with invented ones. Every other mode (dev, production,
 * Storybook, Vitest) is untouched, so the packaged app never contains any of
 * `src/showcase`.
 */
function showcaseFixturePlugin(): Plugin {
  let enabled = false;
  return {
    name: 'shiroani-showcase-fixtures',
    config(config, { mode }) {
      enabled = mode === 'showcase';
      if (!enabled) return;
      const existing = config.resolve?.alias ?? {};
      const inherited = Array.isArray(existing)
        ? existing
        : Object.entries(existing).map(([find, replacement]) => ({ find, replacement }));
      // Listed first so they win over the broader `@` alias.
      config.resolve = {
        ...config.resolve,
        alias: [
          {
            find: /^@\/lib\/quick-access-defaults$/,
            replacement: resolve(__dirname, './src/showcase/fixtures/quick-access-defaults.ts'),
          },
          ...inherited,
        ],
      };
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!enabled) return html;
        return html.replace('/src/main.tsx', '/src/showcase/entry.ts');
      },
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    themeInjectionPlugin(),
    stripDevConnectSources(),
    showcaseFixturePlugin(),
  ],
  base: './', // Use relative paths for Electron compatibility
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Point to source for better dev experience and ESM compatibility
      '@shiroani/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@shiroani/changelog': resolve(__dirname, '../../packages/changelog/src/index.ts'),
    },
  },
  server: {
    port: 15174,
    strictPort: true,
    fs: {
      allow: ['../..'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules/')) return;

          // Rich text editor (Tiptap + ProseMirror) — checked before react
          // to prevent @tiptap/react from landing in vendor-react and creating a cycle
          if (id.includes('/@tiptap/') || id.includes('/prosemirror-')) return 'vendor-tiptap';
          // Core framework (+ zustand which is tiny and depends on react internals)
          if (/\/(react|react-dom|zustand|use-sync-external-store)\//.test(id))
            return 'vendor-react';
          // Radix UI primitives
          if (id.includes('/@radix-ui/')) return 'vendor-radix';
          // Drag-and-drop toolkit
          if (id.includes('/@dnd-kit/')) return 'vendor-dndkit';
          // Icon library
          if (id.includes('/lucide-react/')) return 'vendor-icons';
        },
      },
    },
  },
});
