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
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
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
