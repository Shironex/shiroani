// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import noctcoreArchitecture from '@noctcore/eslint-plugin-architecture';
import noctcoreAsyncSafety from '@noctcore/eslint-plugin-async-safety';
import noctcoreCodeQuality from '@noctcore/eslint-plugin-code-quality';
import noctcoreContracts from '@noctcore/eslint-plugin-contracts';
import noctcoreMonorepo from '@noctcore/eslint-plugin-monorepo';
import noctcoreObservability from '@noctcore/eslint-plugin-observability';
import noctcorePrisma from '@noctcore/eslint-plugin-prisma';
import noctcoreReact from '@noctcore/eslint-plugin-react';
import noctcoreSecurity from '@noctcore/eslint-plugin-security';

const TEST_FILES = [
  '**/*.spec.ts',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/__tests__/**/*.{ts,tsx}',
  '**/test/**/*.ts',
];

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
    plugins: {
      'noctcore-architecture': noctcoreArchitecture,
      'noctcore-async-safety': noctcoreAsyncSafety,
      'noctcore-code-quality': noctcoreCodeQuality,
      'noctcore-contracts': noctcoreContracts,
      'noctcore-monorepo': noctcoreMonorepo,
      'noctcore-observability': noctcoreObservability,
      'noctcore-prisma': noctcorePrisma,
      'noctcore-react': noctcoreReact,
      'noctcore-security': noctcoreSecurity,
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

  // ── Track A: universal guardrails (@noctcore/* plugins) ──
  // Comment, error, async and logging hygiene over our own source. Test files
  // are excluded since fixtures legitimately break these.
  // (no-bare-date-now / no-process-exit are deferred: the former needs a
  // common/clock mockable-time util to exist first; the latter only matched
  // legitimate bootstrap entrypoints. See docs/frontend-architecture-migration.md.)
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/shared/**/*.ts', 'packages/changelog/**/*.ts'],
    ignores: TEST_FILES,
    rules: {
      'noctcore-code-quality/no-historical-comments': 'error',
      'noctcore-code-quality/no-narration-comments': 'error',
      'noctcore-code-quality/no-pr-reference-comments': 'error',
      'noctcore-code-quality/no-template-trim-empty-ternary': 'error',
      'noctcore-contracts/no-error-stringify': 'error',
      'noctcore-contracts/require-error-cause': 'error',
      'noctcore-contracts/fetch-must-check-ok': 'error',
      'noctcore-async-safety/forward-abort-signal': 'error',
      'noctcore-async-safety/no-concurrent-shared-mutation': 'error',
      'noctcore-observability/no-sensitive-fields-in-logs': 'error',
      'noctcore-observability/no-error-detail-loss': 'error',
      'noctcore-monorepo/no-deep-package-imports': ['error', { scopes: ['@shiroani'] }],
      'noctcore-monorepo/no-unexported-subpath-import': ['error', { scopes: ['@shiroani'] }],
    },
  },

  // Node-side processes (Electron main + bot): shell and redirect sinks.
  {
    files: ['apps/desktop/src/**/*.ts', 'apps/bot/src/**/*.ts'],
    ignores: TEST_FILES,
    rules: {
      'noctcore-security/no-shell-interpolation': 'error',
      'noctcore-security/no-user-controlled-redirect': 'error',
    },
  },

  // Bot (NestJS): env only through the validated env module + Prisma
  // data-integrity. app.module.ts is allowlisted — LoggerModule.forRoot reads
  // NODE_ENV/LOG_LEVEL before the DI container (and thus ConfigService) exists.
  {
    files: ['apps/bot/src/**/*.ts'],
    ignores: TEST_FILES,
    rules: {
      'noctcore-contracts/no-direct-process-env': [
        'error',
        {
          configModule: '@/env',
          allowedFiles: [
            '**/apps/bot/src/app.module.ts',
            '**/apps/bot/src/env.ts',
            '**/*.config.{ts,js,mjs,cjs}',
          ],
        },
      ],
      'noctcore-prisma/prisma-write-in-transaction': 'error',
      'noctcore-prisma/prisma-tx-uses-tx-not-client': 'error',
    },
  },

  // React correctness across both React surfaces (web app + landing islands).
  {
    files: ['apps/web/src/**/*.{ts,tsx}', 'apps/landing/src/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: {
      'noctcore-react/context-value-must-be-memoized': 'error',
      'noctcore-react/no-effect-derived-state': 'error',
      'noctcore-react/no-jsx-in-hooks': 'error',
      'noctcore-react/prefer-lazy-state-init': 'error',
    },
  },

  // ── Track B: frontend component-folder architecture (all features migrated) ──
  // The per-feature rollout is complete, so the glob now covers every component.
  // Sidecars (.stories/.test/.parts) and design-system primitives (components/ui)
  // are exempt — they legitimately hold state, computation, and free-form structure.
  {
    files: ['apps/web/src/components/**/*.{ts,tsx}'],
    ignores: ['**/*.stories.tsx', '**/*.test.tsx', '**/*.parts.tsx', '**/components/ui/**'],
    rules: {
      'noctcore-architecture/component-folder-structure': [
        'error',
        { componentRoot: 'src/components' },
      ],
      'noctcore-react/no-state-in-component-body': 'error',
      'noctcore-react/no-jsx-computation': 'error',
      'noctcore-react/max-hooks-per-file': 'error',
      'noctcore-architecture/index-must-reexport-default': 'error',
      'noctcore-architecture/no-cross-feature-imports': [
        'error',
        { featureRoot: 'src/components', sharedFeatures: ['shared', 'ui'] },
      ],
      'noctcore-code-quality/interface-prefix-i': 'error',
      'noctcore-react/props-must-be-visual': 'error',
    },
  },

  // Test discipline: a focused, skipped-without-tracking, conditionally
  // asserting or network-touching test must never land.
  {
    files: TEST_FILES,
    rules: {
      'noctcore-code-quality/no-focused-tests': 'error',
      'noctcore-code-quality/skipped-tests-need-tracking': 'error',
      'noctcore-code-quality/no-conditional-expect': 'error',
      'noctcore-code-quality/fake-timers-must-be-restored': 'error',
      'noctcore-code-quality/no-real-network-in-unit-tests': 'error',
    },
  },

  {
    files: ['**/*.spec.ts', '**/test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/release/**',
      '**/*.js',
      '**/.astro/**',
      '**/.ds-entry/**',
    ],
  }
);
