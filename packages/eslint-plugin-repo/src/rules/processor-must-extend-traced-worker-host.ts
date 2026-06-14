import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'processor-must-extend-traced-worker-host';

type MessageIds = 'mustExtend';

/*
 * Every `@Processor(...)` class must `extends TracedWorkerHost`, never the bare
 * `WorkerHost` from `@nestjs/bullmq`. TracedWorkerHost re-enters the producer's
 * ALS RequestContext and starts the `bullmq.process` OTel span, so a processor
 * on the bare host silently loses request/trace correlation and centralized
 * failure logging. This is our DI-shaped replacement for the upstream
 * `worker-must-listen-failed` rule (which targets standalone `new Worker(...)`).
 * Not auto-fixable: changing a base class is a semantic edit.
 */
function isProcessorDecorator(decorator: TSESTree.Decorator): boolean {
  const expr = decorator.expression;
  if (expr.type === AST_NODE_TYPES.CallExpression) {
    return expr.callee.type === AST_NODE_TYPES.Identifier && expr.callee.name === 'Processor';
  }
  return expr.type === AST_NODE_TYPES.Identifier && expr.name === 'Processor';
}

function extendsTracedWorkerHost(superClass: TSESTree.Node | null): boolean {
  // Covers both `extends TracedWorkerHost` and `extends TracedWorkerHost<T>`
  // (the type arguments hang off the node, the callee stays an Identifier).
  return superClass?.type === AST_NODE_TYPES.Identifier && superClass.name === 'TracedWorkerHost';
}

export const processorMustExtendTracedWorkerHostRule = createRule<[], MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'A class decorated with `@Processor(...)` must extend `TracedWorkerHost`, not the bare `WorkerHost`, so it re-enters ALS/OTel context.',
    },
    schema: [],
    messages: {
      mustExtend:
        'A `@Processor` must extend `TracedWorkerHost` (not the bare `WorkerHost`) so the worker re-enters the producer ALS/OTel context. See common/queue/CONVENTIONS.md.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node): void {
        if (!node.decorators?.some(isProcessorDecorator)) {
          return;
        }
        if (!extendsTracedWorkerHost(node.superClass ?? null)) {
          context.report({ node: node.id ?? node, messageId: 'mustExtend' });
        }
      },
    };
  },
});
