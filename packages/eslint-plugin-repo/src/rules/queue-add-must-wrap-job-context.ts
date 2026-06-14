import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'queue-add-must-wrap-job-context';

export interface QueueAddMustWrapJobContextOptions {
  /** Name of the context-wrapping helper. */
  readonly wrapperName?: string;
}

type RuleOptions = [QueueAddMustWrapJobContextOptions];
type MessageIds = 'mustWrap';

/*
 * A `.add(name, data, ...)` call on an injected BullMQ `Queue` must pass `data`
 * through `withJobContext(...)`, so every producer propagates request/trace
 * context into the worker. Heuristic (no type info): fires on `.add(...)` whose
 * receiver name matches /queue/i (e.g. `this.queue`, `emailQueue`) and whose
 * second argument is not a `withJobContext(...)` call. Report-only: wrapping
 * changes the runtime payload shape, so an autofix would not be safe. The
 * idempotency note (caller owns `jobId`) is documented in CONVENTIONS.md, not
 * lint-enforced, because dedup keys are domain-specific.
 */
const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    wrapperName: { type: 'string' },
  },
};

const DEFAULT_WRAPPER = 'withJobContext';

function receiverLooksLikeQueue(object: TSESTree.Node): boolean {
  // `this.<name>` where <name> matches /queue/i
  if (
    object.type === AST_NODE_TYPES.MemberExpression &&
    !object.computed &&
    object.property.type === AST_NODE_TYPES.Identifier
  ) {
    return /queue/i.test(object.property.name);
  }
  // bare identifier matching /queue/i
  if (object.type === AST_NODE_TYPES.Identifier) {
    return /queue/i.test(object.name);
  }
  return false;
}

function isWrapperCall(node: TSESTree.Node | undefined, wrapperName: string): boolean {
  return (
    node?.type === AST_NODE_TYPES.CallExpression &&
    node.callee.type === AST_NODE_TYPES.Identifier &&
    node.callee.name === wrapperName
  );
}

export const queueAddMustWrapJobContextRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'A `.add(name, data)` call on a BullMQ queue must wrap its data in `withJobContext(...)` so request/trace context propagates to the worker.',
    },
    schema: [optionSchema],
    messages: {
      mustWrap:
        'Wrap the job data in `{{wrapper}}(...)` so the worker re-enters request/trace context. See common/queue/CONVENTIONS.md.',
    },
  },
  defaultOptions: [{ wrapperName: DEFAULT_WRAPPER }],
  create(context, [options]) {
    const wrapperName = options.wrapperName ?? DEFAULT_WRAPPER;

    return {
      CallExpression(node): void {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          callee.property.name !== 'add'
        ) {
          return;
        }
        if (!receiverLooksLikeQueue(callee.object)) {
          return;
        }
        // No data argument -> nothing to wrap; not a producer call we police.
        if (node.arguments.length < 2) {
          return;
        }
        if (!isWrapperCall(node.arguments[1], wrapperName)) {
          context.report({
            node,
            messageId: 'mustWrap',
            data: { wrapper: wrapperName },
          });
        }
      },
    };
  },
});
