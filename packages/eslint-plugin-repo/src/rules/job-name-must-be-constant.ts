import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'job-name-must-be-constant';

type MessageIds = 'mustBeConstant';

/*
 * Queue and job names must be constants from `QUEUE_NAMES` / `*_JOB_NAMES`, not
 * inline string literals, so a typo cannot silently create a second queue and
 * producers/consumers always agree on the name. Two call shapes are checked:
 *   - the first argument to `@Processor('...')`
 *   - the first argument to `<queue>.add('...', ...)`
 * An identifier or member access (the constant) is allowed; a string literal or
 * a no-substitution template literal is flagged. Report-only (no literal->const
 * map to autofix from).
 */
function isInlineNameLiteral(node: TSESTree.Node | undefined): boolean {
  if (node === undefined) {
    return false;
  }
  if (node.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') {
    return true;
  }
  return node.type === AST_NODE_TYPES.TemplateLiteral && node.expressions.length === 0;
}

function isProcessorDecorator(decorator: TSESTree.Decorator): TSESTree.CallExpression | undefined {
  const expr = decorator.expression;
  if (
    expr.type === AST_NODE_TYPES.CallExpression &&
    expr.callee.type === AST_NODE_TYPES.Identifier &&
    expr.callee.name === 'Processor'
  ) {
    return expr;
  }
  return undefined;
}

function receiverLooksLikeQueue(object: TSESTree.Node): boolean {
  if (
    object.type === AST_NODE_TYPES.MemberExpression &&
    !object.computed &&
    object.property.type === AST_NODE_TYPES.Identifier
  ) {
    return /queue/i.test(object.property.name);
  }
  if (object.type === AST_NODE_TYPES.Identifier) {
    return /queue/i.test(object.name);
  }
  return false;
}

export const jobNameMustBeConstantRule = createRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Queue/job names passed to `@Processor(...)` and `<queue>.add(...)` must be constants (from `QUEUE_NAMES` / `*_JOB_NAMES`), not inline string literals.',
    },
    schema: [],
    messages: {
      mustBeConstant:
        'Use a constant from `QUEUE_NAMES` / `*_JOB_NAMES` here, not an inline string literal. See common/queue/CONVENTIONS.md.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      Decorator(node): void {
        const call = isProcessorDecorator(node);
        const arg = call?.arguments[0];
        if (arg !== undefined && isInlineNameLiteral(arg)) {
          context.report({ node: arg, messageId: 'mustBeConstant' });
        }
      },
      CallExpression(node): void {
        const callee = node.callee;
        if (
          callee.type !== AST_NODE_TYPES.MemberExpression ||
          callee.computed ||
          callee.property.type !== AST_NODE_TYPES.Identifier ||
          callee.property.name !== 'add' ||
          !receiverLooksLikeQueue(callee.object)
        ) {
          return;
        }
        const arg = node.arguments[0];
        if (arg !== undefined && isInlineNameLiteral(arg)) {
          context.report({ node: arg, messageId: 'mustBeConstant' });
        }
      },
    };
  },
});
