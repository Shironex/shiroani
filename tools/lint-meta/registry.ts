import { eslintConfigNoWarnRule } from './rules/config/eslint-config-no-warn';
import { noInlineLintDisableRule, noTsIgnoreRule } from './rules/source-text/forbidden-text';
import { skippedTestsNeedTrackingRule } from './rules/testing/skipped-tests-need-tracking';
import type { IMetaRule } from './types';

/*
 * ShiroAni-applicable meta rules. The template also ships nestjs-trpc route,
 * tenancy env-cascade, CI launch-path/pre-push-parity, and GitHub-Actions rules
 * — those are deferred or template-specific and intentionally not wired here
 * (the rule files remain under rules/ for later adoption).
 */
export const META_RULES: readonly IMetaRule[] = [
  eslintConfigNoWarnRule,
  noInlineLintDisableRule,
  noTsIgnoreRule,
  skippedTestsNeedTrackingRule,
];
