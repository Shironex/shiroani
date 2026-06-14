import { existsSync } from 'node:fs';
import { sep } from 'node:path';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

/*
 * nestjs-trpc routers (apps/api/src/**\/*.router.ts) are the API's request
 * surface, so each must ship with a co-located spec. Adapted from BoringStack's
 * `*.routes.ts` -> `tests/**\/*.routes.test.ts` rule: our specs are colocated,
 * not mirrored, so the sibling is `<name>.router.spec.ts` next to the router.
 * This stops a future router from merging untested while the coverage ratchet
 * is still climbing.
 */
const ROUTER_SUFFIX = '.router.ts';
const API_SRC_FRAGMENT = `${sep}apps${sep}api${sep}src${sep}`;

export function checkRoutersHaveTestSibling(sourceFiles: readonly string[]): IViolation[] {
  const violations: IViolation[] = [];

  for (const file of sourceFiles) {
    if (!file.endsWith(ROUTER_SUFFIX) || !file.includes(API_SRC_FRAGMENT)) {
      continue;
    }

    const siblingSpec = `${file.slice(0, -'.ts'.length)}.spec.ts`;
    if (existsSync(siblingSpec)) {
      continue;
    }

    violations.push({
      file,
      rule: 'routes-require-test-sibling',
      message: `Router has no co-located spec. Add \`${siblingSpec.split(sep).pop() ?? ''}\` next to it so the request surface is tested.`,
    });
  }

  return violations;
}

/** Every nestjs-trpc *.router.ts must have a co-located *.router.spec.ts. */
export const routesRequireTestSiblingRule: IMetaRule = {
  id: 'routes-require-test-sibling',
  category: 'testing',
  ciCritical: true,
  description: 'nestjs-trpc *.router.ts files must have a co-located *.router.spec.ts.',
  run({ sourceFiles }: IMetaContext): IViolation[] {
    return checkRoutersHaveTestSibling(sourceFiles);
  },
};
