import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'prisma-write-in-transaction';

export interface PrismaWriteInTransactionOptions {
  readonly thresholdWrites?: number;
}

type RuleOptions = [PrismaWriteInTransactionOptions];
type MessageIds = 'multiWriteNotTransactional';

/*
 * Two or more Prisma writes in one function/method body that are NOT wrapped in
 * a `$transaction` risk a partial-failure split-brain: the first write commits,
 * the second throws, and the row set is left half-written. This rule counts
 * non-transactional Prisma writes per innermost function scope and reports the
 * Nth such write (default N = 2). A write is transactional when it is lexically
 * inside a `$transaction(...)` call - either the interactive callback form
 * `<client>.$transaction(async (tx) => { ... })` or the array form
 * `<client>.$transaction([ ...write calls... ])`.
 */
const DEFAULT_THRESHOLD = 2;

const WRITE_METHODS: ReadonlySet<string> = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
]);

const PRISMA_RE = /prisma/i;

/*
 * The repository base class exposes the scoped Prisma client as `this.client`
 * (BaseRepository `get client()`), so `this.client.firma.create(...)` is a real
 * Prisma write whose chain contains no `/prisma/i` token. Recognise the `client`
 * property so two such repository writes outside a `$transaction` are still
 * counted as a partial-failure split-brain risk.
 */
const CLIENT_PROPERTY = 'client';

const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    thresholdWrites: { type: 'integer', minimum: 2 },
  },
};

/*
 * A write CallExpression has a non-computed MemberExpression callee whose
 * property is one of the Prisma write methods, and whose receiver chain root
 * looks like a Prisma client: any identifier/property name down the
 * `callee.object` chain matches /prisma/i, or the root identifier is `tx`.
 */
function isPrismaWriteCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) {
    return false;
  }
  if (
    callee.property.type !== AST_NODE_TYPES.Identifier ||
    !WRITE_METHODS.has(callee.property.name)
  ) {
    return false;
  }
  return receiverLooksLikePrisma(callee.object);
}

function receiverLooksLikePrisma(start: TSESTree.Node): boolean {
  let current: TSESTree.Node = start;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    if (
      current.property.type === AST_NODE_TYPES.Identifier &&
      (current.property.name === CLIENT_PROPERTY || PRISMA_RE.test(current.property.name))
    ) {
      return true;
    }
    current = current.object;
  }
  if (current.type === AST_NODE_TYPES.Identifier) {
    return current.name === 'tx' || PRISMA_RE.test(current.name);
  }
  return false;
}

function isTransactionCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === '$transaction'
  );
}

export const prismaWriteInTransactionRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow two or more Prisma writes in a single function/method body that are not wrapped in a `$transaction`. A partial failure between writes leaves half-written state.',
    },
    schema: [optionSchema],
    messages: {
      multiWriteNotTransactional:
        'Two or more Prisma writes in this method run outside a transaction. Wrap them in prisma.client.$transaction(...) so a partial failure cannot leave half-written state.',
    },
  },
  defaultOptions: [{ thresholdWrites: DEFAULT_THRESHOLD }],
  create(context, [options]) {
    const threshold = options.thresholdWrites ?? DEFAULT_THRESHOLD;

    // One counter per innermost function scope.
    const scopeStack: number[] = [];
    // >0 while inside any `$transaction(...)` call subtree (callback or array).
    let txDepth = 0;

    function enterScope(): void {
      scopeStack.push(0);
    }

    function exitScope(): void {
      scopeStack.pop();
    }

    return {
      FunctionDeclaration: enterScope,
      'FunctionDeclaration:exit': exitScope,
      FunctionExpression: enterScope,
      'FunctionExpression:exit': exitScope,
      ArrowFunctionExpression: enterScope,
      'ArrowFunctionExpression:exit': exitScope,

      CallExpression(node: TSESTree.CallExpression): void {
        if (isTransactionCall(node)) {
          txDepth += 1;
          return;
        }
        if (txDepth > 0) {
          // Inside a `$transaction(...)` subtree: array elements and callback
          // body writes are both transactional, so never counted.
          return;
        }
        if (!isPrismaWriteCall(node)) {
          return;
        }
        if (scopeStack.length === 0) {
          return;
        }
        const top = scopeStack.length - 1;
        const nextCount = (scopeStack[top] ?? 0) + 1;
        scopeStack[top] = nextCount;
        if (nextCount === threshold) {
          context.report({ node, messageId: 'multiWriteNotTransactional' });
        }
      },
      'CallExpression:exit'(node: TSESTree.CallExpression): void {
        if (isTransactionCall(node)) {
          txDepth -= 1;
        }
      },
    };
  },
});
