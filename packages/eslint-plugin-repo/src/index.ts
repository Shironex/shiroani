import type { TSESLint } from '@typescript-eslint/utils';

import { recommendedRules } from './configs/recommended';
import { rules } from './rules';
import { noFocusedTestsRule } from './rules/no-focused-tests';

type RepoPlugin = TSESLint.FlatConfig.Plugin & {
  configs: Record<string, TSESLint.FlatConfig.Config>;
};

const plugin: RepoPlugin = {
  meta: {
    name: '@shiroani/eslint-plugin-repo',
    version: '0.0.0',
  },
  rules,
  configs: {},
};

// Short name `repo` so rules read `repo/no-focused-tests` in flat config.
plugin.configs.recommended = {
  plugins: {
    repo: plugin,
  },
  rules: recommendedRules,
};

export { noFocusedTestsRule };
export { rules };
export const configs = plugin.configs;
export default plugin;
