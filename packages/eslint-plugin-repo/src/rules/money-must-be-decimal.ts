import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';

import { createRule } from '../utils/createRule';

export const RULE_NAME = 'money-must-be-decimal';

export interface MoneyMustBeDecimalOptions {
  readonly namePattern?: string;
  readonly allowedFiles?: readonly string[];
}

type RuleOptions = [MoneyMustBeDecimalOptions];
type MessageIds = 'moneyMustBeDecimal';

/*
 * Monetary amounts stored as a JS `number` accumulate IEEE-754 rounding errors
 * (0.1 + 0.2 !== 0.3), which is unacceptable for accounting/ERP figures. The
 * domain money type is Prisma.Decimal / Decimal. This rule is a DORMANT guard:
 * it fires only when a money-named field is EXPLICITLY typed as the primitive
 * `number`, so it stays green on a codebase that has no money fields yet and
 * lights up the moment one is introduced with the wrong type.
 *
 * Conservative on purpose:
 *   - Only an explicit `: number` annotation (TSNumberKeyword) is flagged.
 *     Untyped declarations and numeric-literal initializers are NOT flagged
 *     (those catch loop counters/accumulators like `let total = 0`).
 *   - Only class properties (PropertyDefinition) and annotated variable
 *     declarators (VariableDeclarator) are covered. Interface / type-literal
 *     members (TSPropertySignature) are intentionally excluded: the current
 *     codebase has non-money `amount: number` / `total: number` type members
 *     (download progress, demo fixtures) that must not regress.
 */
const DEFAULT_NAME_PATTERN =
  '(amount|price|total|netto|brutto|vat|kwota|cena|wartosc|sum|balance|fee|cost)';

const DEFAULT_ALLOWED_FILES: readonly string[] = [];

const optionSchema: JSONSchema4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    namePattern: { type: 'string' },
    allowedFiles: {
      type: 'array',
      items: { type: 'string' },
      uniqueItems: true,
    },
  },
};

/** Forward-slash form of a filename so suffix matching is OS-independent. */
function toForwardSlash(filename: string): string {
  return filename.split('\\').join('/');
}

/**
 * True when the file is covered by one of the allowlist entries. An entry
 * matches when the (forward-slashed) filename ends with it, so callers can pass
 * a path suffix like `apps/api/src/legacy/totals.ts`. An empty list allowlists
 * nothing (the rule stays active everywhere).
 */
function isAllowedFile(filename: string, patterns: readonly string[]): boolean {
  if (patterns.length === 0) {
    return false;
  }
  const normalized = toForwardSlash(filename);
  return patterns.some(pattern => normalized.endsWith(toForwardSlash(pattern)));
}

/** The plain string name of a property/identifier key, or undefined if computed/dynamic. */
function staticName(node: TSESTree.Node): string | undefined {
  if (node.type === AST_NODE_TYPES.Identifier) {
    return node.name;
  }
  return undefined;
}

/** True when the annotation node directly resolves to the primitive `number`. */
function isNumberAnnotation(annotation: TSESTree.TSTypeAnnotation | undefined): boolean {
  return annotation?.typeAnnotation.type === AST_NODE_TYPES.TSNumberKeyword;
}

export const moneyMustBeDecimalRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow monetary values typed as the JS primitive `number`. Money-named fields explicitly typed `: number` lose precision to float rounding; use a Decimal money type (Prisma.Decimal) instead.',
    },
    schema: [optionSchema],
    messages: {
      moneyMustBeDecimal:
        'Monetary values must use Decimal (Prisma.Decimal), never JS number, to avoid float rounding errors. Rename or retype this to a Decimal money type.',
    },
  },
  defaultOptions: [
    {
      namePattern: DEFAULT_NAME_PATTERN,
      allowedFiles: [],
    },
  ],
  create(context, [options]) {
    const allowedFiles = options.allowedFiles ?? DEFAULT_ALLOWED_FILES;

    if (isAllowedFile(context.filename, allowedFiles)) {
      return {};
    }

    const moneyPattern = new RegExp(options.namePattern ?? DEFAULT_NAME_PATTERN, 'i');

    return {
      // `class Invoice { total: number }`: class field explicitly typed number.
      PropertyDefinition(node): void {
        if (node.computed) {
          return;
        }
        const name = staticName(node.key);
        if (
          name !== undefined &&
          moneyPattern.test(name) &&
          isNumberAnnotation(node.typeAnnotation)
        ) {
          context.report({ node, messageId: 'moneyMustBeDecimal' });
        }
      },
      // `const total: number = ...`: annotated variable declarator.
      VariableDeclarator(node): void {
        if (node.id.type !== AST_NODE_TYPES.Identifier) {
          return;
        }
        const name = node.id.name;
        if (moneyPattern.test(name) && isNumberAnnotation(node.id.typeAnnotation)) {
          context.report({ node, messageId: 'moneyMustBeDecimal' });
        }
      },
    };
  },
});
