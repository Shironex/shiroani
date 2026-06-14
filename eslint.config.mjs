// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import repo from '@shiroani/eslint-plugin-repo';

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    linterOptions: {
      // error-or-off policy: a stale suppression is a lint failure, not a warning.
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // ── Track A: universal guardrails (custom @shiroani/eslint-plugin-repo) ──
  // Comment + error hygiene over our own source. Test files are excluded since
  // fixtures legitimately break these; the plugin + lint-meta tooling fall
  // outside these globs so they are not linted against their own rules.
  // (no-bare-date-now / no-process-exit are deferred: the former needs a
  // common/clock mockable-time util to exist first; the latter only matched
  // legitimate bootstrap entrypoints. See docs/frontend-architecture-migration.md.)
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/shared/**/*.ts', 'packages/changelog/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.test.ts', '**/*.test.tsx', '**/test/**'],
    plugins: { repo },
    rules: {
      'repo/no-historical-comments': 'error',
      'repo/no-narration-comments': 'error',
      'repo/no-pr-reference-comments': 'error',
      'repo/no-error-stringify': 'error',
      'repo/no-template-trim-empty-ternary': 'error',
    },
  },

  // Bot (NestJS): env only through the validated ConfigService + Prisma
  // data-integrity. app.module.ts is allowlisted — LoggerModule.forRoot reads
  // NODE_ENV/LOG_LEVEL before the DI container (and thus ConfigService) exists.
  {
    files: ['apps/bot/src/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/test/**'],
    plugins: { repo },
    rules: {
      'repo/no-direct-process-env': [
        'error',
        { allowedFiles: ['apps/bot/src/app.module.ts', '**/*.config.{ts,js,mjs,cjs}'] },
      ],
      'repo/prisma-write-in-transaction': 'error',
      'repo/prisma-tx-uses-tx-not-client': 'error',
    },
  },

  // ── Track B: frontend component-folder architecture (per-feature rollout) ──
  // Scoped to migrated features only; this glob widens by one feature per chunk
  // (collapses to src/components/** once all are migrated). Sidecars
  // (.stories/.test/.parts) and design-system primitives (components/ui) are
  // exempt — they legitimately hold state, computation, and free-form structure.
  {
    files: ['apps/web/src/components/social/**/*.{ts,tsx}'],
    ignores: ['**/*.stories.tsx', '**/*.test.tsx', '**/*.parts.tsx', '**/components/ui/**'],
    plugins: { repo },
    rules: {
      'repo/component-folder-structure': ['error', { featuresDir: 'src/components' }],
      'repo/no-state-in-component-body': 'error',
      'repo/no-jsx-computation': 'error',
      'repo/max-hooks-per-file': 'error',
      'repo/index-must-reexport-default': 'error',
      'repo/no-cross-feature-imports': [
        'error',
        { featuresDir: 'src/components', sharedFeatures: ['shared'] },
      ],
      'repo/interface-prefix-i': 'error',
      'repo/props-must-be-visual': 'error',
    },
  },

  {
    files: ['**/*.spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/release/**', '**/*.js', '**/.astro/**'],
  }
);
