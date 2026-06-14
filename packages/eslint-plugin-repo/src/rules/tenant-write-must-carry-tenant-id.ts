import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { createRule } from '../utils/createRule';
import { chainResolvesToUnscoped, isMemberNamed } from '../utils/prisma-receiver';

export const RULE_NAME = 'tenant-write-must-carry-tenant-id';

export interface TenantWriteMustCarryTenantIdOptions {
  /** Prisma model accessors that are tenant-scoped (camelCase client accessors). */
  readonly tenantModels?: readonly string[];
  /**
   * Tenant discriminator columns that must ALL appear in `data`. A single-tenant
   * model lists `['tenantId']`; a Firma-scoped model lists `['tenantId', 'firmaId']`
   * so the static guard can enforce the full composite scope on create.
   */
  readonly tenantFields?: readonly string[];
}

type RuleOptions = [TenantWriteMustCarryTenantIdOptions];
type MessageIds = 'missingTenantId';

/*
 * The request-path EXTENDED Prisma client (`this.prisma.client.firma...`,
 * `tx.firma...`) auto-injects the scope columns on create via `$extends`, so
 * policing it here would be pure noise. This rule guards only the UNSCOPED escape
 * hatch (`this.prisma.unscoped.firma.create(...)`), which does NOT auto-scope: a
 * create on a tenant model through that client must carry every tenant field in
 * its `data` or the new row is orphaned / cross-tenant.
 *
 * Heuristic only (identifier names + member-expression shapes + single-hop scope
 * resolution, no type info):
 *   - the call method is `create` or `createMany`;
 *   - the receiver is a `<...>.firma` accessor (tenantModels registry);
 *   - the receiver chain reaches the unscoped client (directly, or via a local
 *     binding resolved back to `.unscoped` / a `{ unscoped }` destructure).
 *
 * Verifiability policy (DELIBERATELY the inverse of the require-where rule):
 * we report ONLY on a statically determinable ABSENCE of a tenant field.
 * Anything we cannot statically verify is ALLOWED, never flagged:
 *   - a `data` whose value is an identifier / spread-bearing object;
 *   - a missing `data` key or missing argument;
 *   - object spreads inside `data` (the spread may supply the fields);
 *   - createMany elements that are not plain object literals;
 *   - a `.map(...)` whose returned object cannot be cleanly extracted.
 * Report-only: injecting a tenantId is not a trivially safe autofix.
 */
const WRITE_METHODS: ReadonlySet<string> = new Set(['create', 'createMany']);

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

/**
 * Compliance check for a single object literal. Returns true (= ALLOW) when the
 * object is not statically verifiable as missing a field: any spread element
 * means we cannot tell, so we allow. Returns false ONLY when this is a concrete
 * object literal that demonstrably lacks at least one non-computed tenant field.
 */
function objectLiteralCarriesAllTenantFields(
  obj: TSESTree.ObjectExpression,
  tenantFields: readonly string[]
): boolean {
  if (obj.properties.some(prop => prop.type === AST_NODE_TYPES.SpreadElement)) {
    return true;
  }
  return tenantFields.every(field =>
    obj.properties.some(
      prop =>
        prop.type === AST_NODE_TYPES.Property &&
        !prop.computed &&
        prop.key.type === AST_NODE_TYPES.Identifier &&
        prop.key.name === field
    )
  );
}

/**
 * Returns the object expression a `.map(...)` callback yields, when it can be
 * cleanly extracted, or undefined otherwise (-> caller allows).
 * Handles arrow concise body `=> ({...})` (ESTree exposes the ObjectExpression
 * directly) and a block body whose ReturnStatement returns an object literal.
 */
function mapCallbackReturnedObject(
  call: TSESTree.CallExpression,
  tenantFields: readonly string[]
): { found: true; compliant: boolean } | undefined {
  const callee = call.callee;
  if (!isMemberNamed(callee, 'map')) {
    return undefined;
  }
  const callback = call.arguments[0];
  if (
    callback === undefined ||
    (callback.type !== AST_NODE_TYPES.ArrowFunctionExpression &&
      callback.type !== AST_NODE_TYPES.FunctionExpression)
  ) {
    return undefined;
  }
  const body = callback.body;
  // Concise arrow body returning an object literal: `() => ({ ... })`.
  if (body.type === AST_NODE_TYPES.ObjectExpression) {
    return { found: true, compliant: objectLiteralCarriesAllTenantFields(body, tenantFields) };
  }
  // Block body: look for a top-level `return { ... }`.
  if (body.type === AST_NODE_TYPES.BlockStatement) {
    const returned = body.body.find(
      (stmt): stmt is TSESTree.ReturnStatement => stmt.type === AST_NODE_TYPES.ReturnStatement
    );
    if (
      returned?.argument === undefined ||
      returned.argument === null ||
      returned.argument.type !== AST_NODE_TYPES.ObjectExpression
    ) {
      return undefined;
    }
    return {
      found: true,
      compliant: objectLiteralCarriesAllTenantFields(returned.argument, tenantFields),
    };
  }
  return undefined;
}

/**
 * Decide whether a write call is non-compliant (should report). Returns true
 * ONLY when the `data` value is statically determinable AND demonstrably lacks
 * a tenant field. Every unverifiable shape returns false (allow).
 */
function writeIsMissingTenantFields(
  arg: TSESTree.Node | undefined,
  tenantFields: readonly string[]
): boolean {
  if (arg === undefined || arg.type !== AST_NODE_TYPES.ObjectExpression) {
    return false;
  }
  const dataProp = arg.properties.find(
    (prop): prop is TSESTree.Property =>
      prop.type === AST_NODE_TYPES.Property &&
      !prop.computed &&
      prop.key.type === AST_NODE_TYPES.Identifier &&
      prop.key.name === 'data'
  );
  if (dataProp === undefined) {
    return false;
  }
  const dataValue = dataProp.value;

  // create-shape: `data: { ... }`.
  if (dataValue.type === AST_NODE_TYPES.ObjectExpression) {
    return !objectLiteralCarriesAllTenantFields(dataValue, tenantFields);
  }

  // createMany-shape: `data: [ { ... }, { ... } ]`.
  if (dataValue.type === AST_NODE_TYPES.ArrayExpression) {
    return dataValue.elements.some(
      element =>
        element !== null &&
        element.type === AST_NODE_TYPES.ObjectExpression &&
        !objectLiteralCarriesAllTenantFields(element, tenantFields)
    );
  }

  // createMany-shape: `data: items.map((x) => ({ ... }))`.
  if (dataValue.type === AST_NODE_TYPES.CallExpression) {
    const mapped = mapCallbackReturnedObject(dataValue, tenantFields);
    return mapped !== undefined && !mapped.compliant;
  }

  // Any other value (identifier, conditional, etc.) is unverifiable: allow.
  return false;
}

export const tenantWriteMustCarryTenantIdRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'A create on a tenant-scoped Prisma model through the UNSCOPED client must set every tenant field (tenantId, and firmaId for Firma-scoped models) in `data`. The unscoped client does not auto-scope, unlike the request-path extended client.',
    },
    schema: [optionSchema],
    messages: {
      missingTenantId:
        'A create on a tenant-scoped table via the unscoped client must set every tenant field (e.g. tenantId) in data; the unscoped client does not auto-scope.',
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
        // Method must be a non-computed `.create(...)` or `.createMany(...)`.
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          !WRITE_METHODS.has(callee.property.name)
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
        if (writeIsMissingTenantFields(node.arguments[0], tenantFields)) {
          context.report({ node, messageId: 'missingTenantId' });
        }
      },
    };
  },
});
