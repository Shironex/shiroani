/*
 * Recommended severities for consumers of this plugin. The repo's own
 * enablement lives in packages/eslint-config/base.js (where no-focused-tests is
 * additionally scoped to test files); this map is the documented default set.
 * prefer-early-return ships 'off' because its violation count is
 * codebase-dependent: enable it per-repo once the tree is clean (the no-warn
 * policy forbids a 'warn' rollout).
 */
export const recommendedRules = {
  'repo/no-focused-tests': 'error',
  'repo/no-historical-comments': 'error',
  'repo/no-narration-comments': 'error',
  'repo/no-pr-reference-comments': 'error',
  'repo/no-direct-process-env': 'error',
  'repo/no-process-exit': 'error',
  'repo/no-error-stringify': 'error',
  'repo/no-template-trim-empty-ternary': 'error',
  'repo/prefer-early-return': 'off',
  // BullMQ / queue conventions. The repo enables these scoped to apps/api
  // non-spec source in packages/eslint-config/nestjs.js.
  'repo/processor-must-extend-traced-worker-host': 'error',
  'repo/queue-add-must-wrap-job-context': 'error',
  'repo/job-name-must-be-constant': 'error',
  'repo/no-bare-date-now': 'error',
  // Frontend component-architecture rules (Phase 4) ship 'off' here: they need
  // path scoping (features/**, packages/ui exclusion) that a flat recommended
  // map cannot express. The repo enables them via
  // packages/eslint-config/react-architecture.js (apps/web + packages/ui).
  'repo/component-folder-structure': 'off',
  'repo/no-cross-feature-imports': 'off',
  'repo/max-hooks-per-file': 'off',
  'repo/no-state-in-component-body': 'off',
  'repo/no-jsx-computation': 'off',
  'repo/props-must-be-visual': 'off',
  'repo/index-must-reexport-default': 'off',
  'repo/interface-prefix-i': 'off',
  // Backend tenancy + Prisma data-integrity rules (Phase 7) ship 'off' here:
  // they need path scoping to apps/api src that a flat recommended map cannot
  // express. The repo enables them via packages/eslint-config/nestjs.js.
  // money-must-be-decimal stays 'off' everywhere (dormant Domain-Wave-0 guard).
  'repo/prisma-write-in-transaction': 'off',
  'repo/prisma-tx-uses-tx-not-client': 'off',
  'repo/no-cross-tenant-id-in-where': 'off',
  'repo/no-unscoped-prisma-outside-allowlist': 'off',
  'repo/mutating-service-must-audit': 'off',
  'repo/tenant-scoped-tables-require-where': 'off',
  'repo/tenant-write-must-carry-tenant-id': 'off',
  'repo/money-must-be-decimal': 'off',
} as const;
