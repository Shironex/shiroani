import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'prisma-tx-uses-tx-not-client';

type MessageIds = 'mustUseTxParam';

/*
 * Inside a `$transaction(async (tx) => ...)` interactive callback, a write that
 * goes through the OUTER client (e.g. `this.prisma.client.firma.create(...)`)
 * instead of the `tx` parameter (`tx.firma.create(...)`) runs on a different
 * connection and silently escapes the transaction's rollback. Heuristic (no
 * type info): on entering a `.$transaction(fn)` call whose first argument is a
 * function with an Identifier first param, push that param name; while inside,
 * any Prisma write method call (create/createMany/update/updateMany/upsert/
 * delete/deleteMany) whose receiver-chain root identifier is NOT that param is
 * reported. Report-only: rewriting the receiver is not a trivially safe autofix.
 */
const WRITE_METHODS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

const TRANSACTION_METHOD = '$transaction';

const PRISMA_RE = /prisma/iu;

/*
 * The repository base class exposes the scoped Prisma client as `this.client`
 * (BaseRepository `get client()`), so `this.client.firma.create(...)` is a real
 * Prisma write whose chain contains no `/prisma/i` token. Recognise the `client`
 * property so a write through the outer `this.client` inside a `$transaction`
 * callback is caught the same as `this.prisma.client...`.
 */
const CLIENT_PROPERTY = 'client';

/** True for an arrow function or a function expression (the interactive callback form). */
function isFunctionNode(
  node: TSESTree.Node | undefined
): node is TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression {
  return (
    node?.type === AST_NODE_TYPES.ArrowFunctionExpression ||
    node?.type === AST_NODE_TYPES.FunctionExpression
  );
}

/**
 * Name of the callee's property if the callee is a non-computed member access
 * (e.g. `$transaction` in `this.prisma.client.$transaction(...)`), else undefined.
 */
function calleePropertyName(callee: TSESTree.Node): string | undefined {
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return callee.property.name;
  }
  return undefined;
}

/**
 * The first parameter name of an interactive `$transaction` callback, or
 * undefined when the call is not the interactive form (no function callback, or
 * a non-Identifier first param such as a destructuring pattern). Returning
 * undefined means "do not police writes here", which keeps the rule quiet on
 * the array form `$transaction([...])`.
 */
function transactionParamName(node: TSESTree.CallExpression): string | undefined {
  if (calleePropertyName(node.callee) !== TRANSACTION_METHOD) {
    return undefined;
  }
  const callback = node.arguments[0];
  if (!isFunctionNode(callback)) {
    return undefined;
  }
  const firstParam = callback.params[0];
  if (firstParam?.type === AST_NODE_TYPES.Identifier) {
    return firstParam.name;
  }
  return undefined;
}

/**
 * Root identifier name of a receiver chain. Walks `member.object` links down to
 * the base: `tx.invoice` -> 'tx', `this.prisma.client.firma` -> undefined (root
 * is `this`, not an Identifier). A non-Identifier root never equals the tx
 * param, so it is treated as the outer client and reported.
 */
function receiverRootName(node: TSESTree.Node): string | undefined {
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    current = current.object;
  }
  if (current.type === AST_NODE_TYPES.Identifier) {
    return current.name;
  }
  return undefined;
}

/**
 * Whether a receiver chain looks like a Prisma client, so that a write on it is
 * actually a Prisma write and not an unrelated fluent `.update()` / `.delete()`
 * (e.g. `createHash('sha256').update(...)`, `this.cache.delete(key)`). True when
 * any non-computed property in the chain matches /prisma/i (e.g.
 * `this.prisma.client.firma`), the root identifier matches /prisma/i (e.g.
 * `prisma.firma`), or the root identifier is the conventional transaction
 * client name `tx` (e.g. an OUTER `tx.invoice.create` misused inside an inner
 * tx2 callback). Mirrors the sibling prisma-write-in-transaction gate so the
 * two rules agree on what counts as a Prisma client receiver.
 */
function receiverLooksLikePrisma(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    if (
      !current.computed &&
      current.property.type === AST_NODE_TYPES.Identifier &&
      (current.property.name === CLIENT_PROPERTY || PRISMA_RE.test(current.property.name))
    ) {
      return true;
    }
    current = current.object;
  }
  if (current.type !== AST_NODE_TYPES.Identifier) {
    return false;
  }
  return current.name === 'tx' || PRISMA_RE.test(current.name);
}

export const prismaTxUsesTxNotClientRule = createRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Inside a `$transaction(async (tx) => ...)` callback, writes must go through the `tx` parameter, not the outer client, so they participate in the transaction and roll back together.',
    },
    schema: [],
    messages: {
      mustUseTxParam:
        'Inside a $transaction(async (tx) => ...) callback, use tx.<model> for writes, not the outer client, which runs on a different connection and escapes rollback.',
    },
  },
  defaultOptions: [],
  create(context) {
    // Stack of active interactive-transaction param names. Innermost (last)
    // wins so nested transactions each police against their own `tx`.
    const txParamStack: string[] = [];

    return {
      CallExpression(node: TSESTree.CallExpression): void {
        const paramName = transactionParamName(node);
        if (paramName !== undefined) {
          txParamStack.push(paramName);
          return;
        }

        // Not inside any interactive transaction -> nothing to police.
        if (txParamStack.length === 0) {
          return;
        }

        const callee = node.callee;
        const methodName = calleePropertyName(callee);
        if (methodName === undefined || !WRITE_METHODS.has(methodName)) {
          return;
        }

        // callee is a non-computed MemberExpression here (calleePropertyName
        // returned a name), so `.object` is the receiver chain.
        const receiver = (callee as TSESTree.MemberExpression).object;
        const rootName = receiverRootName(receiver);
        const activeTxParam = txParamStack[txParamStack.length - 1];
        if (rootName === activeTxParam) {
          // The write already goes through the innermost tx param: compliant.
          return;
        }

        // Only police receivers that are actually a Prisma client. A write-named
        // method on something else (e.g. `createHash('sha256').update(...)`, a
        // Map/cache `.delete(key)`) is not a Prisma write and must not be
        // flagged. A receiver is a Prisma client when its chain looks like one,
        // or when its root is an OUTER transaction param (also a Prisma client,
        // just the wrong one for the active scope).
        const rootIsOuterTxParam = rootName !== undefined && txParamStack.includes(rootName);
        if (receiverLooksLikePrisma(receiver) || rootIsOuterTxParam) {
          context.report({ node, messageId: 'mustUseTxParam' });
        }
      },
      'CallExpression:exit'(node: TSESTree.CallExpression): void {
        if (transactionParamName(node) !== undefined) {
          txParamStack.pop();
        }
      },
    };
  },
});
