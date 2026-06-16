import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname = __dirname;

/**
 * Two Vitest 4 projects:
 *  - `unit`      — the existing jsdom + Testing Library suite (fast behavior tests).
 *  - `storybook` — every story run as a real-browser test (render smoke + play
 *                  interactions + axe a11y) via @storybook/addon-vitest +
 *                  Playwright Chromium. Run with `--project=unit|storybook`.
 */
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@': path.resolve(dirname, './src'),
            '@shiroani/shared': path.resolve(dirname, '../../packages/shared/src/index.ts'),
          },
        },
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          clearMocks: true,
          passWithNoTests: false,
          include: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
            'src/**/*.spec.ts',
            'src/**/*.spec.tsx',
          ],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
        // The storybookTest plugin doesn't merge vite.config.ts's resolve.alias the
        // way `storybook build` does, so `@/…` / `@shiroani/*` must be declared here
        // or preview.tsx + stories fail to resolve their imports in browser mode.
        resolve: {
          alias: {
            '@': path.resolve(dirname, './src'),
            '@shiroani/shared': path.resolve(dirname, '../../packages/shared/src/index.ts'),
            '@shiroani/changelog': path.resolve(dirname, '../../packages/changelog/src/index.ts'),
          },
        },
        // Browser mode serves modules over HTTP; pnpm's virtual store lives at the
        // monorepo root, so the addon's injected setup file (and other hoisted deps)
        // must be within fs.allow or the browser fails to fetch them.
        server: {
          fs: {
            allow: [path.resolve(dirname, '../..')],
          },
        },
        test: {
          name: 'storybook',
          // Browser-mode runs occasionally flake on CI with "Failed to fetch
          // dynamically imported module" / "failed to find the current suite" —
          // a transient module-fetch race under load, not a real test failure.
          // Retry failed story files so a flake doesn't redden the whole run.
          retry: 2,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
          // @storybook/addon-vitest auto-applies the preview annotations
          // (decorators + a11y config) since Storybook 10.3 — no setup file needed.
        },
      },
    ],
    coverage: {
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts'],
    },
  },
});
