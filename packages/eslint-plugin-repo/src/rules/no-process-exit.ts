import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { isAllowlisted } from '../utils/allowlist';
import { createRule } from '../utils/createRule';

export const RULE_NAME = 'no-process-exit';

export interface NoProcessExitOptions {
  readonly allowedFiles?: readonly string[];
}

type RuleOptions = [NoProcessExitOptions];
type MessageIds = 'processExit';

/*
 * `process.exit()` belongs only to bootstrap/shutdown paths and standalone
 * CLIs, never to request-scoped service code where it would kill the whole
 * process mid-request:
 *   - otel.ts flushes spans then exits on SIGTERM/SIGINT.
 *   - apps/api/src/main.ts is the bootstrap entrypoint; its bootstrap().catch
 *     must exit non-zero so the orchestrator restarts a half-built process.
 *   - apps/desktop (Electron main + build scripts) and packages/database (Prisma
 *     seed) are standalone entrypoints.
 *   - tools/** are repo CLIs (lint:meta runner, docs generator).
 */
const DEFAULT_ALLOWED_FILES: readonly string[] = [
  '**/otel.ts',
  '**/apps/api/src/main.ts',
  'apps/desktop/**',
  'packages/database/**',
  'tools/**',
  '**/scripts/**',
  '**/*.config.{ts,js,mjs,cjs}',
];

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

function isProcessExit(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  return (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    !callee.computed &&
    callee.object.type === AST_NODE_TYPES.Identifier &&
    callee.object.name === 'process' &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === 'exit'
  );
}

export const noProcessExitRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow `process.exit()` outside bootstrap/shutdown paths and standalone CLIs. Service code must throw or reject so NestJS can shut down gracefully.',
    },
    schema: [optionSchema],
    messages: {
      processExit:
        '`process.exit()` is reserved for bootstrap/shutdown and CLI entrypoints. Throw or reject and let the lifecycle handle teardown.',
    },
  },
  defaultOptions: [{ allowedFiles: [...DEFAULT_ALLOWED_FILES] }],
  create(context, [options]) {
    const allowedFiles = options.allowedFiles ?? DEFAULT_ALLOWED_FILES;

    if (isAllowlisted(context.filename, allowedFiles)) {
      return {};
    }

    return {
      CallExpression(node): void {
        if (isProcessExit(node)) {
          context.report({ node, messageId: 'processExit' });
        }
      },
    };
  },
});
