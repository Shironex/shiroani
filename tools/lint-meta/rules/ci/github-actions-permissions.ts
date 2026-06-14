import { readFileSync } from 'node:fs';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

/*
 * Every workflow must declare a top-level `permissions:` block so the
 * GITHUB_TOKEN is least-privilege instead of inheriting the repo default
 * (often read/write). SHA-pinning of `uses:` refs is a separate
 * supply-chain concern that needs an action-update mechanism (Renovate /
 * Dependabot for actions) to be maintainable; it is deferred to that phase.
 */
export function checkWorkflowPermissions(file: string): IViolation[] {
  const text = readFileSync(file, 'utf8');

  if (/^permissions\s*:/mu.test(text)) {
    return [];
  }

  return [
    {
      file,
      rule: 'github-actions-permissions',
      message:
        'Workflow is missing a top-level `permissions:` block. Declare least-privilege token scopes (e.g. `permissions:\\n  contents: read`).',
    },
  ];
}

/** Every GitHub Actions workflow must declare a top-level permissions block. */
export const githubActionsPermissionsRule: IMetaRule = {
  id: 'github-actions-permissions',
  category: 'ci',
  description: 'GitHub Actions workflows must declare a top-level permissions block.',
  run({ workflowFiles }: IMetaContext): IViolation[] {
    return workflowFiles.flatMap(checkWorkflowPermissions);
  },
};
