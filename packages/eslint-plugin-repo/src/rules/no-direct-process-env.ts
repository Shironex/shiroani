import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { isAllowlisted } from '../utils/allowlist';
import { createRule } from '../utils/createRule';

export const RULE_NAME = 'no-direct-process-env';

export interface NoDirectProcessEnvOptions {
  readonly allowedFiles?: readonly string[];
  readonly singletonSuggestion?: string;
}

type RuleOptions = [NoDirectProcessEnvOptions];
type MessageIds = 'directProcessEnv';

/*
 * Files that legitimately read process.env before the NestJS DI container
 * exists (so ConfigService is not yet resolvable), or that run outside Nest
 * entirely:
 *   - otel.ts boots before any @nestjs/* import (tracing monkey-patch).
 *   - the @repo/shared universal logger runs in Node, the browser, and Electron,
 *     so it cannot depend on a NestJS-only ConfigService.
 *   - logger.service.ts is also constructed pre-DI as the bootstrap logger
 *     (`new CustomLogger()` in main.ts).
 *   - sentry-scrub.ts is a deliberately SDK-free, framework-free scrubber that
 *     reads the OS home dir / username at module load to anonymise stack-frame
 *     paths; it is a pure function module, not a Nest provider.
 *   - packages/database (Prisma client + seed) and apps/desktop (Electron) have
 *     no Nest DI surface.
 *   - *.config.ts / playwright.config.ts, *.spec/*.test files, and the api test
 *     harness (apps/api/test/**) are tooling and tests, which configure or stub
 *     env directly (e.g. seeding a required key before ConfigModule validates).
 */
const DEFAULT_ALLOWED_FILES: readonly string[] = [
  '**/otel.ts',
  'packages/shared/src/logger/**',
  'apps/api/src/modules/logger/logger.service.ts',
  'apps/api/src/common/observability/sentry-scrub.ts',
  'apps/api/test/**',
  'packages/database/**',
  'apps/desktop/**',
  '**/*.config.{ts,js,mjs,cjs}',
  '**/playwright.config.ts',
  '**/*.{spec,test}.{ts,tsx}',
];

const DEFAULT_SUGGESTION = "ConfigService.get('X') from @nestjs/config";

const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    allowedFiles: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
    },
    singletonSuggestion: { type: 'string', minLength: 1 },
  },
};

function isProcessEnv(node: TSESTree.Node): boolean {
  return (
    node.type === AST_NODE_TYPES.MemberExpression &&
    !node.computed &&
    node.object.type === AST_NODE_TYPES.Identifier &&
    node.object.name === 'process' &&
    node.property.type === AST_NODE_TYPES.Identifier &&
    node.property.name === 'env'
  );
}

export const noDirectProcessEnvRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct `process.env` access. Force every consumer through the typed, Joi-validated `ConfigService` so a missing variable fails at boot, not at use.',
    },
    schema: [optionSchema],
    messages: {
      directProcessEnv:
        'Read environment variables via the validated singleton ({{suggestion}}). `process.env.X` bypasses the boot-time Joi schema check.',
    },
  },
  defaultOptions: [
    {
      allowedFiles: [...DEFAULT_ALLOWED_FILES],
      singletonSuggestion: DEFAULT_SUGGESTION,
    },
  ],
  create(context, [options]) {
    const allowedFiles = options.allowedFiles ?? DEFAULT_ALLOWED_FILES;
    const suggestion = options.singletonSuggestion ?? DEFAULT_SUGGESTION;

    if (isAllowlisted(context.filename, allowedFiles)) {
      return {};
    }

    function report(node: TSESTree.Node): void {
      context.report({ node, messageId: 'directProcessEnv', data: { suggestion } });
    }

    return {
      // `process.env.X` (read or write) and `process.env[X]`
      MemberExpression(node): void {
        if (isProcessEnv(node.object)) {
          report(node);
        }
      },
      // `const { X, Y } = process.env`
      VariableDeclarator(node): void {
        if (node.init !== null && isProcessEnv(node.init)) {
          report(node.init);
        }
      },
      // `({ X } = process.env)` assignment-pattern destructure
      AssignmentExpression(node): void {
        if (node.left.type === AST_NODE_TYPES.ObjectPattern && isProcessEnv(node.right)) {
          report(node.right);
        }
      },
    };
  },
});
