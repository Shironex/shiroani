import { componentFolderStructureRule } from './component-folder-structure';
import { indexMustReexportDefaultRule } from './index-must-reexport-default';
import { interfacePrefixIRule } from './interface-prefix-i';
import { jobNameMustBeConstantRule } from './job-name-must-be-constant';
import { maxHooksPerFileRule } from './max-hooks-per-file';
import { noBareDateNowRule } from './no-bare-date-now';
import { noCrossFeatureImportsRule } from './no-cross-feature-imports';
import { noDirectProcessEnvRule } from './no-direct-process-env';
import { noJsxComputationRule } from './no-jsx-computation';
import { noStateInComponentBodyRule } from './no-state-in-component-body';
import { propsMustBeVisualRule } from './props-must-be-visual';
import { noErrorStringifyRule } from './no-error-stringify';
import { noFocusedTestsRule } from './no-focused-tests';
import { noHistoricalCommentsRule } from './no-historical-comments';
import { noNarrationCommentsRule } from './no-narration-comments';
import { noPrReferenceCommentsRule } from './no-pr-reference-comments';
import { noProcessExitRule } from './no-process-exit';
import { noTemplateTrimEmptyTernaryRule } from './no-template-trim-empty-ternary';
import { preferEarlyReturnRule } from './prefer-early-return';
import { processorMustExtendTracedWorkerHostRule } from './processor-must-extend-traced-worker-host';
import { queueAddMustWrapJobContextRule } from './queue-add-must-wrap-job-context';
import { prismaWriteInTransactionRule } from './prisma-write-in-transaction';
import { prismaTxUsesTxNotClientRule } from './prisma-tx-uses-tx-not-client';
import { noCrossTenantIdInWhereRule } from './no-cross-tenant-id-in-where';
import { noUnscopedPrismaOutsideAllowlistRule } from './no-unscoped-prisma-outside-allowlist';
import { mutatingServiceMustAuditRule } from './mutating-service-must-audit';
import { tenantScopedTablesRequireWhereRule } from './tenant-scoped-tables-require-where';
import { tenantWriteMustCarryTenantIdRule } from './tenant-write-must-carry-tenant-id';
import { moneyMustBeDecimalRule } from './money-must-be-decimal';

export const rules = {
  'no-focused-tests': noFocusedTestsRule,
  'no-historical-comments': noHistoricalCommentsRule,
  'no-narration-comments': noNarrationCommentsRule,
  'no-pr-reference-comments': noPrReferenceCommentsRule,
  'no-direct-process-env': noDirectProcessEnvRule,
  'no-process-exit': noProcessExitRule,
  'no-error-stringify': noErrorStringifyRule,
  'no-template-trim-empty-ternary': noTemplateTrimEmptyTernaryRule,
  'prefer-early-return': preferEarlyReturnRule,
  'processor-must-extend-traced-worker-host': processorMustExtendTracedWorkerHostRule,
  'queue-add-must-wrap-job-context': queueAddMustWrapJobContextRule,
  'job-name-must-be-constant': jobNameMustBeConstantRule,
  'no-bare-date-now': noBareDateNowRule,
  // Frontend component-architecture rules (Phase 4). Enabled + scoped in
  // @repo/eslint-config/react-architecture; 'off' in recommended (below).
  'component-folder-structure': componentFolderStructureRule,
  'no-cross-feature-imports': noCrossFeatureImportsRule,
  'max-hooks-per-file': maxHooksPerFileRule,
  'no-state-in-component-body': noStateInComponentBodyRule,
  'no-jsx-computation': noJsxComputationRule,
  'props-must-be-visual': propsMustBeVisualRule,
  'index-must-reexport-default': indexMustReexportDefaultRule,
  'interface-prefix-i': interfacePrefixIRule,
  // Backend tenancy + Prisma data-integrity rules (Phase 7). Enabled at 'error'
  // scoped to apps/api src in @repo/eslint-config/nestjs.js; 'off' in
  // recommended (below). money-must-be-decimal is a dormant Domain-Wave-0 guard:
  // registered here but NOT enabled anywhere yet (see nestjs.js note).
  'prisma-write-in-transaction': prismaWriteInTransactionRule,
  'prisma-tx-uses-tx-not-client': prismaTxUsesTxNotClientRule,
  'no-cross-tenant-id-in-where': noCrossTenantIdInWhereRule,
  'no-unscoped-prisma-outside-allowlist': noUnscopedPrismaOutsideAllowlistRule,
  'mutating-service-must-audit': mutatingServiceMustAuditRule,
  'tenant-scoped-tables-require-where': tenantScopedTablesRequireWhereRule,
  'tenant-write-must-carry-tenant-id': tenantWriteMustCarryTenantIdRule,
  'money-must-be-decimal': moneyMustBeDecimalRule,
};
