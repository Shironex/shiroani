import { eslintConfigNoWarnRule } from './rules/config/eslint-config-no-warn';
import { envCascadeDriftRule } from './rules/config/env-cascade-drift';
import { eslintOverridePathsExistRule } from './rules/config/eslint-override-paths-exist';
import { githubActionsPermissionsRule } from './rules/ci/github-actions-permissions';
import { githubActionsTimeoutRequiredRule } from './rules/ci/github-actions-timeout-required';
import { launchPathParityRule } from './rules/ci/launch-path-parity';
import { prePushCiParityRule } from './rules/ci/pre-push-ci-parity';
import { noInlineLintDisableRule, noTsIgnoreRule } from './rules/source-text/forbidden-text';
import { routesRequireTestSiblingRule } from './rules/testing/routes-require-test-sibling';
import { skippedTestsNeedTrackingRule } from './rules/testing/skipped-tests-need-tracking';
import type { IMetaRule } from './types';

export const META_RULES: readonly IMetaRule[] = [
  eslintConfigNoWarnRule,
  eslintOverridePathsExistRule,
  envCascadeDriftRule,
  noInlineLintDisableRule,
  noTsIgnoreRule,
  skippedTestsNeedTrackingRule,
  routesRequireTestSiblingRule,
  githubActionsPermissionsRule,
  githubActionsTimeoutRequiredRule,
  launchPathParityRule,
  prePushCiParityRule,
];
