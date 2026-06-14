import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { createRule } from '../utils/createRule';
import { chainResolvesToUnscoped } from '../utils/prisma-receiver';

export const RULE_NAME = 'tenant-scoped-tables-require-where';

export interface TenantScopedTablesRequireWhereOptions {
  /** Prisma model accessors that are tenant-scoped (camelCase client accessors). */
  readonly tenantModels?: readonly string[];
  /**
   * Tenant discriminator columns that must ALL appear in `where`. A single-tenant
   * model lists `['tenantId']`; a Firma-scoped model lists `['tenantId', 'firmaId']`
   * so the static guard can enforce the full composite scope, not just the biuro.
   */
  readonly tenantFields?: readonly string[];
}

type RuleOptions = [TenantScopedTablesRequireWhereOptions];
type MessageIds = 'missingTenantWhere';

/*
 * The request-path EXTENDED Prisma client (`this.prisma.client.firma...`,
 * `tx.firma...`) auto-injects the scope columns via `$extends`, so policing it
 * here would be pure noise. This rule guards only the UNSCOPED escape hatch
 * (`this.prisma.unscoped.firma...`), which does NOT auto-scope: a read/update/
 * delete on a tenant model through that client must carry every tenant field in
 * its `where` or it leaks across tenants.
 *
 * Heuristic only (identifier names + member-expression shapes + single-hop scope
 * resolution, no type info):
 *   - the call's method is one of the guarded read/bulk-mutation methods;
 *   - its receiver is a `<...>.firma` accessor (tenantModels registry);
 *   - the receiver chain reaches the unscoped client (directly, or via a local
 *     binding resolved back to `.unscoped` / a `{ unscoped }` destructure);
 *   - the first argument's `where` object is missing one of the `tenantFields`.
 * findUnique / findUniqueOrThrow are exempt (they take a unique selector, not an
 * arbitrary scope filter; callers use findFirst). Report-only: injecting a where
 * clause is not a trivially safe autofix.
 */
const GUARDED_METHODS: ReadonlySet<string> = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'updateMany',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
]);

const DEFAULT_TENANT_MODELS: readonly string[] = ['firma'];
const DEFAULT_TENANT_FIELDS: readonly string[] = ['tenantId'];

const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    tenantModels: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
    },
    tenantFields: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
      minItems: 1,
    },
  },
};

/** True when an object literal has a non-computed property named `name`. */
function objectHasKey(obj: TSESTree.ObjectExpression, name: string): boolean {
  return obj.properties.some(
    prop =>
      prop.type === AST_NODE_TYPES.Property &&
      !prop.computed &&
      prop.key.type === AST_NODE_TYPES.Identifier &&
      prop.key.name === name
  );
}

/**
 * Given the first call argument, returns true when it is an object literal whose
 * `where` value is an object literal containing EVERY tenant field (shorthand
 * `{ tenantId }` or `{ tenantId: ... }`). A missing arg, missing `where`, or a
 * where missing any one field is treated as non-compliant (-> report).
 */
function whereHasAllTenantFields(
  arg: TSESTree.Node | undefined,
  tenantFields: readonly string[]
): boolean {
  if (arg === undefined || arg.type !== AST_NODE_TYPES.ObjectExpression) {
    return false;
  }
  const whereProp = arg.properties.find(
    (prop): prop is TSESTree.Property =>
      prop.type === AST_NODE_TYPES.Property &&
      !prop.computed &&
      prop.key.type === AST_NODE_TYPES.Identifier &&
      prop.key.name === 'where'
  );
  if (whereProp === undefined || whereProp.value.type !== AST_NODE_TYPES.ObjectExpression) {
    return false;
  }
  const whereObject = whereProp.value;
  return tenantFields.every(field => objectHasKey(whereObject, field));
}

export const tenantScopedTablesRequireWhereRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'A read/update/delete on a tenant-scoped Prisma model through the UNSCOPED client must include every tenant field (tenantId, and firmaId for Firma-scoped models) in its `where`. The unscoped client does not auto-scope, unlike the request-path extended client.',
    },
    schema: [optionSchema],
    messages: {
      missingTenantWhere:
        'A query on a tenant-scoped table via the unscoped client must include every tenant field (e.g. tenantId) in its where clause; the unscoped client does not auto-scope.',
    },
  },
  defaultOptions: [
    {
      tenantModels: [...DEFAULT_TENANT_MODELS],
      tenantFields: [...DEFAULT_TENANT_FIELDS],
    },
  ],
  create(context, [options]) {
    const tenantModels = new Set(options.tenantModels ?? DEFAULT_TENANT_MODELS);
    const tenantFields = options.tenantFields ?? DEFAULT_TENANT_FIELDS;

    return {
      CallExpression(node): void {
        const callee = node.callee;
        // Method must be a non-computed `.<guardedMethod>(...)`.
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          !GUARDED_METHODS.has(callee.property.name)
        ) {
          return;
        }
        // Receiver must be a `<...>.firma` model accessor in the registry.
        const modelAccessor = callee.object;
        if (
          modelAccessor.type !== AST_NODE_TYPES.MemberExpression ||
          modelAccessor.computed ||
          modelAccessor.property.type !== AST_NODE_TYPES.Identifier ||
          !tenantModels.has(modelAccessor.property.name)
        ) {
          return;
        }
        // Only the unscoped client is policed; the extended client auto-scopes.
        // Resolve bare-identifier receivers (`const { unscoped } = svc; ...`)
        // back through their binding so a local alias cannot bypass the rule.
        if (!chainResolvesToUnscoped(modelAccessor.object, context.sourceCode.getScope(node))) {
          return;
        }
        if (!whereHasAllTenantFields(node.arguments[0], tenantFields)) {
          context.report({ node, messageId: 'missingTenantWhere' });
        }
      },
    };
  },
});
