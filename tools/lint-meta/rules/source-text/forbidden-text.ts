import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

/*
 * Generated output legitimately carries blanket suppressions: TanStack's
 * routeTree.gen.ts and codegen banners disable linting for the whole file.
 * Skip generated files so the ban applies only to hand-written source.
 */
function isGenerated(file: string): boolean {
  return (
    /\.gen\.tsx?$/u.test(basename(file)) ||
    file.includes('/@generated/') ||
    file.includes('/generated/')
  );
}

/*
 * Test and mock files legitimately use inline eslint-disable to stub partial
 * mocks or exercise edge cases the rules forbid in production. The ban on inline
 * disables applies to shipped source; tests/mocks are exempt.
 */
function isTestOrMock(file: string): boolean {
  return (
    /\.(test|spec)\.tsx?$/u.test(file) ||
    file.includes('/__tests__/') ||
    file.includes('/__mocks__/') ||
    file.includes('/test/') ||
    file.includes('/tests/')
  );
}

const INLINE_DISABLE = /\beslint-disable(?:-next-line|-line)?\b/u;
const TS_SUPPRESSION = /@ts-(?:ignore|expect-error)\b/u;

function scan(
  sourceFiles: readonly string[],
  pattern: RegExp,
  rule: string,
  message: string
): IViolation[] {
  const violations: IViolation[] = [];

  for (const file of sourceFiles) {
    if (isGenerated(file)) {
      continue;
    }
    if (pattern.test(readFileSync(file, 'utf8'))) {
      violations.push({ file, rule, message });
    }
  }

  return violations;
}

/** No inline `// eslint-disable` directives in hand-written source. */
export const noInlineLintDisableRule: IMetaRule = {
  id: 'no-inline-lint-disable',
  category: 'source-text',
  description: 'Production source files must not contain inline eslint-disable directives.',
  run({ sourceFiles }: IMetaContext): IViolation[] {
    return scan(
      sourceFiles.filter(file => !isTestOrMock(file)),
      INLINE_DISABLE,
      'no-inline-lint-disable',
      'Inline eslint-disable is not allowed. Fix the rule violation, or add a scoped override to eslint config (a generated-file path is exempt).'
    );
  },
};

/** No `@ts-ignore` / `@ts-expect-error` suppressions in source. */
export const noTsIgnoreRule: IMetaRule = {
  id: 'no-ts-ignore',
  category: 'source-text',
  description: 'Source files must not contain @ts-ignore / @ts-expect-error suppressions.',
  run({ sourceFiles }: IMetaContext): IViolation[] {
    return scan(
      sourceFiles,
      TS_SUPPRESSION,
      'no-ts-ignore',
      'TypeScript suppression comments are not allowed. Narrow the type or fix the underlying error.'
    );
  },
};
