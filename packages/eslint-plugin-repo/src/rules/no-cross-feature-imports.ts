import path from 'node:path';

import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { createRule } from '../utils/createRule';
import { DEFAULT_FEATURES_DIR, getFeatureName } from '../utils/component-architecture';

export const RULE_NAME = 'no-cross-feature-imports';

export interface NoCrossFeatureImportsOptions {
  readonly featuresDir?: string;
  readonly sharedFeatures?: readonly string[];
  readonly allowTypeImports?: boolean;
}

type RuleOptions = [NoCrossFeatureImportsOptions];
type MessageIds = 'crossFeatureImport';

/*
 * A file in `features/A` may not import runtime code from `features/B`: domains
 * stay decoupled so a change in one feature cannot ripple into another. Shared
 * code lives in `@/lib`, `@/components`, or a designated shared feature
 * (`features/shared`, importable by all). Type-only imports are allowed by
 * default. Both the `@/features/<name>` alias form and relative paths that climb
 * into another feature are detected.
 */
const FEATURE_ALIAS = /^@\/features\/([^/]+)/;

const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    featuresDir: { type: 'string' },
    sharedFeatures: { type: 'array', items: { type: 'string' }, uniqueItems: true },
    allowTypeImports: { type: 'boolean' },
  },
};

function resolveTargetFeature(
  source: string,
  currentFile: string,
  featuresDir: string
): string | null {
  const aliasMatch = FEATURE_ALIAS.exec(source);
  if (aliasMatch) {
    return aliasMatch[1] ?? null;
  }
  if (source.startsWith('.')) {
    const resolved = path.resolve(path.dirname(currentFile), source);
    return getFeatureName(resolved, featuresDir);
  }
  return null;
}

export const noCrossFeatureImportsRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'A file in one feature may not import runtime code from another feature. Move shared code to `@/lib`, `@/components`, or `features/shared`.',
    },
    schema: [optionSchema],
    messages: {
      crossFeatureImport:
        'Cross-feature import: `{{current}}` may not import from `features/{{target}}`. Move shared code to `@/lib`, `@/components`, or `features/shared`.',
    },
  },
  defaultOptions: [
    {
      featuresDir: DEFAULT_FEATURES_DIR,
      sharedFeatures: ['shared'],
      allowTypeImports: true,
    },
  ],
  create(context, [options]) {
    const featuresDir = options.featuresDir ?? DEFAULT_FEATURES_DIR;
    const sharedFeatures = options.sharedFeatures ?? ['shared'];
    const allowTypeImports = options.allowTypeImports ?? true;

    const current = getFeatureName(context.filename, featuresDir);
    if (current === null) {
      return {};
    }

    function check(node: TSESTree.ImportDeclaration): void {
      if (allowTypeImports && node.importKind === 'type') {
        return;
      }
      const source = node.source.value;
      const target = resolveTargetFeature(source, context.filename, featuresDir);
      if (target === null || target === current || sharedFeatures.includes(target)) {
        return;
      }
      context.report({
        node: node.source,
        messageId: 'crossFeatureImport',
        data: { current, target },
      });
    }

    return {
      ImportDeclaration(node): void {
        if (node.source.type === AST_NODE_TYPES.Literal && typeof node.source.value === 'string') {
          check(node);
        }
      },
    };
  },
});
