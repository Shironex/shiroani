import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { isAllowlisted } from '../utils/allowlist';
import { createRule } from '../utils/createRule';
import { isPrismaLikeReceiver, isUnscopedDestructure } from '../utils/prisma-receiver';

export const RULE_NAME = 'no-unscoped-prisma-outside-allowlist';

export interface NoUnscopedPrismaOutsideAllowlistOptions {
  readonly allowedFiles?: readonly string[];
}

type RuleOptions = [NoUnscopedPrismaOutsideAllowlistOptions];
type MessageIds = 'unscopedOutsideAllowlist';

/*
 * With no row-level security, the tenant-scoping Prisma extension is the only
 * thing that keeps one tenant from reading another's rows. The unscoped/raw
 * client (`this.prisma.unscoped.*`) and the `runWithoutTenantScope(...)` escape
 * hatch both bypass that extension, so they are a silent cross-tenant leak
 * anywhere except a handful of legitimate system contexts:
 *   - seeds (prisma/seed.ts, prisma/seed-load.ts, *.seed.ts) run before any
 *     request context exists and intentionally populate every tenant.
 *   - prisma/migrations/** is generated SQL, never request-scoped.
 *   - *.isolation.spec.ts deliberately drives the unscoped client to assert
 *     that scoping works.
 *   - the prisma.service.ts itself is the designated plumbing where the
 *     unscoped client is constructed and owned.
 *
 * A `**\/*.system.ts` wildcard was intentionally NOT included: a filename
 * suffix is too broad an opt-out (any file could rename itself to bypass the
 * guard), and no such files exist. Add a specific path if a real system file
 * ever needs it.
 */
const DEFAULT_ALLOWED_FILES: readonly string[] = [
  '**/prisma/seed.ts',
  '**/prisma/seed-load.ts',
  '**/*.seed.ts',
  '**/prisma/migrations/**',
  '**/*.isolation.spec.ts',
  '**/common/database/prisma.service.ts',
];

const RUN_WITHOUT_SCOPE_FN = 'runWithoutTenantScope';
const UNSCOPED_PROPERTY = 'unscoped';

const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    allowedFiles: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
    },
  },
};

export const noUnscopedPrismaOutsideAllowlistRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the unscoped/raw Prisma client (`prisma.unscoped`) and the `runWithoutTenantScope` escape hatch outside a small allowlist of seeds, migrations, isolation tests, and designated system files. Bypassing the tenant-scoping extension is a silent cross-tenant data leak.',
    },
    schema: [optionSchema],
    messages: {
      unscopedOutsideAllowlist:
        'The unscoped Prisma client bypasses tenant isolation. It is allowed only in seeds, migrations, the isolation tests, and designated system files. Use the tenant-scoped client (prismaService.client) here.',
    },
  },
  defaultOptions: [
    {
      allowedFiles: [...DEFAULT_ALLOWED_FILES],
    },
  ],
  create(context, [options]) {
    const allowedFiles = options.allowedFiles ?? DEFAULT_ALLOWED_FILES;

    if (isAllowlisted(context.filename, allowedFiles)) {
      return {};
    }

    return {
      // `<prisma-like>.unscoped` member access (the unscoped/raw client).
      MemberExpression(node): void {
        if (
          !node.computed &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === UNSCOPED_PROPERTY &&
          isPrismaLikeReceiver(node.object)
        ) {
          context.report({ node, messageId: 'unscopedOutsideAllowlist' });
        }
      },
      // `const { unscoped } = this.prismaService` (or aliased) pulls the raw
      // client into a local binding. The member-access matcher above never sees
      // the `.unscoped` token in that form, so flag the destructure site itself;
      // otherwise the binding is a silent escape from tenant isolation.
      VariableDeclarator(node): void {
        if (isUnscopedDestructure(node)) {
          context.report({ node, messageId: 'unscopedOutsideAllowlist' });
        }
      },
      // `runWithoutTenantScope(...)` direct call to the escape-hatch function.
      CallExpression(node): void {
        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === RUN_WITHOUT_SCOPE_FN
        ) {
          context.report({ node, messageId: 'unscopedOutsideAllowlist' });
        }
      },
    };
  },
});
