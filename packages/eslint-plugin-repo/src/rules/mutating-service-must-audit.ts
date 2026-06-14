import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'mutating-service-must-audit';

type MessageIds = 'auditInsideTransaction';

/*
 * Our audit logger (`this.auditService.log(...)`) is awaited and swallows its own
 * errors by design, so it never throws and there is nothing to police about
 * fire-and-forget here. The one real hazard is placement: an audit write made
 * INSIDE a business `$transaction(...)` callback is rolled back together with the
 * business work, so a rolled-back transaction silently loses its audit row. This
 * rule reports any audit `.log(...)` call (receiver matching /audit/i) that is
 * lexically nested inside a `$transaction(...)` callback. Heuristic only (no type
 * info): we key on the `$transaction` member name and on an /audit/i receiver.
 * Report-only; the fix (move the audit after the commit) is not a safe autofix.
 * We deliberately do NOT try to assert that every mutation calls audit -- that is
 * too false-positive-prone for Wave 0.
 */

function receiverLooksLikeAudit(object: TSESTree.Node): boolean {
  // `this.<name>` / `foo.<name>` where <name> matches /audit/i (e.g. `this.auditService`).
  if (
    object.type === AST_NODE_TYPES.MemberExpression &&
    !object.computed &&
    object.property.type === AST_NODE_TYPES.Identifier
  ) {
    return /audit/i.test(object.property.name);
  }
  // bare identifier matching /audit/i (e.g. `auditService`).
  if (object.type === AST_NODE_TYPES.Identifier) {
    return /audit/i.test(object.name);
  }
  return false;
}

function isAuditLogCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === 'log' &&
    receiverLooksLikeAudit(callee.object)
  );
}

function isTransactionCallback(fn: TSESTree.Node): boolean {
  // The function is an argument of a `<receiver>.$transaction(...)` call.
  const parent = fn.parent;
  if (parent === undefined || parent === null || parent.type !== AST_NODE_TYPES.CallExpression) {
    return false;
  }
  if (!parent.arguments.includes(fn as TSESTree.CallExpressionArgument)) {
    return false;
  }
  const callee = parent.callee;
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === '$transaction'
  );
}

function isInsideTransactionCallback(node: TSESTree.Node): boolean {
  // Walk lexical ancestry to the root; "inside the callback" === ancestor
  // containment, so a nested inner callback (e.g. a `.forEach(...)`) still counts.
  // The `Program` root's `.parent` is null, which terminates the loop.
  let current: TSESTree.Node | undefined | null = node.parent;
  while (current !== undefined && current !== null) {
    if (
      (current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
        current.type === AST_NODE_TYPES.FunctionExpression) &&
      isTransactionCallback(current)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export const mutatingServiceMustAuditRule = createRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Do not call the audit logger inside a `$transaction` callback; a rolled-back business transaction would also lose the audit row. Audit after the transaction commits.',
    },
    schema: [],
    messages: {
      auditInsideTransaction:
        'Do not call the audit logger inside a $transaction callback. If the business transaction rolls back the audit row is lost. Audit after the transaction commits.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node): void {
        if (!isAuditLogCall(node)) {
          return;
        }
        if (isInsideTransactionCallback(node)) {
          context.report({ node, messageId: 'auditInsideTransaction' });
        }
      },
    };
  },
});
