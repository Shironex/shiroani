import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'no-cross-tenant-id-in-where';

export interface NoCrossTenantIdInWhereOptions {
  /** Prisma model accessors that are tenant-scoped (e.g. `firma`). */
  readonly tenantModels?: readonly string[];
  /** Field name that carries the tenant id (e.g. `tenantId`). */
  readonly tenantField?: string;
  /** Root identifiers that represent untrusted client input. */
  readonly untrustedRoots?: readonly string[];
  /** Trusted server-context sources for a tenant id value (documentation only). */
  readonly trustedSources?: readonly string[];
}

type RuleOptions = [NoCrossTenantIdInWhereOptions];
type MessageIds = 'untrustedTenantSource';

/*
 * IDOR / provenance guard. With no RLS, the tenantId set on a Prisma
 * query/write is the primary cross-tenant boundary. If that tenantId VALUE is
 * traced back to a client-controlled root (input/dto/body/query/params/req),
 * a caller can read or mutate another tenant's rows by supplying a foreign id.
 *
 * Heuristic (no type info): a CallExpression to a Prisma write or query method
 * (create, update, delete, upsert, find, count, aggregate, groupBy variants) on
 * a receiver whose model accessor is in `tenantModels` (default ['firma']). Its first arg
 * object is inspected for `where` and/or `data`; within each, a `tenantField`
 * (default 'tenantId') property is found and its value node is traced. If the
 * value is a MemberExpression chain rooted at an untrusted root identifier, it
 * is reported. Trusted sources (getTenantId(), ctx.tenantId, store.tenantId,
 * session.tenantId) are calls or chains rooted at trusted identifiers and so
 * never trip the untrusted-root test. Report-only: the fix is to swap the
 * value source, which is not a mechanically safe autofix.
 */
const DEFAULT_TENANT_MODELS = ['firma'] as const;
const DEFAULT_TENANT_FIELD = 'tenantId';
const DEFAULT_UNTRUSTED_ROOTS = ['input', 'dto', 'body', 'query', 'params', 'req'] as const;
const DEFAULT_TRUSTED_SOURCES = [
  'getTenantId',
  'ctx.tenantId',
  'store.tenantId',
  'session.tenantId',
] as const;

const PRISMA_METHODS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'findUnique',
  'findFirst',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

const INSPECTED_ARG_KEYS = ['where', 'data'] as const;

const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tenantModels: { type: 'array', items: { type: 'string' }, uniqueItems: true },
    tenantField: { type: 'string' },
    untrustedRoots: { type: 'array', items: { type: 'string' }, uniqueItems: true },
    trustedSources: { type: 'array', items: { type: 'string' }, uniqueItems: true },
  },
};

/** Plain identifier name of a property key, or null for computed/string keys we do not match. */
function staticKeyName(prop: TSESTree.ObjectLiteralElement): string | null {
  if (prop.type !== AST_NODE_TYPES.Property || prop.computed) {
    return null;
  }
  if (prop.key.type === AST_NODE_TYPES.Identifier) {
    return prop.key.name;
  }
  if (prop.key.type === AST_NODE_TYPES.Literal && typeof prop.key.value === 'string') {
    return prop.key.value;
  }
  return null;
}

/** Find the value node for a property named `name` in an object expression. */
function findPropertyValue(
  obj: TSESTree.ObjectExpression,
  name: string
): TSESTree.Expression | null {
  for (const prop of obj.properties) {
    if (staticKeyName(prop) === name && prop.type === AST_NODE_TYPES.Property) {
      return prop.value as TSESTree.Expression;
    }
  }
  return null;
}

/** Walk a member-expression chain to its base; return the root Identifier name, or null. */
function rootIdentifierName(node: TSESTree.Node): string | null {
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    current = current.object;
  }
  if (current.type === AST_NODE_TYPES.Identifier) {
    return current.name;
  }
  return null;
}

/** The Prisma model accessor name on a `<receiver>.<method>` callee, e.g. `firma` in `x.firma.findMany`. */
function modelAccessorName(methodCallee: TSESTree.MemberExpression): string | null {
  const receiver = methodCallee.object;
  if (
    receiver.type === AST_NODE_TYPES.MemberExpression &&
    !receiver.computed &&
    receiver.property.type === AST_NODE_TYPES.Identifier
  ) {
    return receiver.property.name;
  }
  // bare receiver: `firma.findMany(...)`
  if (receiver.type === AST_NODE_TYPES.Identifier) {
    return receiver.name;
  }
  return null;
}

export const noCrossTenantIdInWhereRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'A Prisma query/write on a tenant-scoped model must not set its tenant id from client input. With no RLS, a client-supplied tenant id is a cross-tenant access (IDOR).',
    },
    schema: [optionSchema],
    messages: {
      untrustedTenantSource:
        'The tenantId in this query must come from server context (getTenantId(), ctx.tenantId, store.tenantId), never from client input. A client-supplied tenant id is a cross-tenant access (IDOR).',
    },
  },
  defaultOptions: [
    {
      tenantModels: [...DEFAULT_TENANT_MODELS],
      tenantField: DEFAULT_TENANT_FIELD,
      untrustedRoots: [...DEFAULT_UNTRUSTED_ROOTS],
      trustedSources: [...DEFAULT_TRUSTED_SOURCES],
    },
  ],
  create(context, [options]) {
    const tenantModels = new Set(options.tenantModels ?? DEFAULT_TENANT_MODELS);
    const tenantField = options.tenantField ?? DEFAULT_TENANT_FIELD;
    const untrustedRoots = new Set(options.untrustedRoots ?? DEFAULT_UNTRUSTED_ROOTS);

    /** A tenantId value sourced from a member chain rooted at an untrusted client root. */
    function valueIsUntrusted(value: TSESTree.Expression): boolean {
      if (value.type !== AST_NODE_TYPES.MemberExpression) {
        return false;
      }
      const root = rootIdentifierName(value);
      return root !== null && untrustedRoots.has(root);
    }

    return {
      CallExpression(node): void {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          !PRISMA_METHODS.has(callee.property.name)
        ) {
          return;
        }

        const model = modelAccessorName(callee);
        if (model === null || !tenantModels.has(model)) {
          return;
        }

        const firstArg = node.arguments[0];
        if (firstArg === undefined || firstArg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }

        for (const key of INSPECTED_ARG_KEYS) {
          const section = findPropertyValue(firstArg, key);
          if (section === null || section.type !== AST_NODE_TYPES.ObjectExpression) {
            continue;
          }
          const tenantValue = findPropertyValue(section, tenantField);
          if (tenantValue !== null && valueIsUntrusted(tenantValue)) {
            context.report({ node: tenantValue, messageId: 'untrustedTenantSource' });
          }
        }
      },
    };
  },
});
