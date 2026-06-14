import { readFileSync } from 'node:fs';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

/*
 * `.skip` / `.fixme` / `xit` / `xdescribe` are escape hatches that rot into
 * permanent dark zones if left unowned. Each must carry a tracking marker (an
 * issue URL or `TODO(@owner)`) within the lookback window so the debt has a
 * human attached. `.only` is NOT listed here: repo/no-focused-tests bans it
 * outright, so it can never legitimately appear with or without tracking.
 */
const SKIP_PATTERNS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\b(?:it|test|describe)\.skip\s*\(/u, label: '.skip(' },
  { pattern: /\b(?:it|test|describe)\.fixme\s*\(/u, label: '.fixme(' },
  { pattern: /\bxit\s*\(/u, label: 'xit(' },
  { pattern: /\bxdescribe\s*\(/u, label: 'xdescribe(' },
  { pattern: /\bxtest\s*\(/u, label: 'xtest(' },
];

const TRACKING_PATTERNS: readonly RegExp[] = [/https?:\/\/\S+/u, /TODO\([^\s)]+\)/u];
const TEST_FILE_SUFFIX = /\.(spec|test)\.tsx?$/u;
const TRACKING_LOOKBACK = 30;

function hasTrackingComment(context: string): boolean {
  return TRACKING_PATTERNS.some(pattern => pattern.test(context));
}

export function checkSkippedTestsHaveTracking(sourceFiles: readonly string[]): IViolation[] {
  const violations: IViolation[] = [];

  for (const file of sourceFiles) {
    if (!TEST_FILE_SUFFIX.test(file)) {
      continue;
    }

    const lines = readFileSync(file, 'utf8').split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      for (const { pattern, label } of SKIP_PATTERNS) {
        if (!pattern.test(line)) {
          continue;
        }

        const start = Math.max(0, i - TRACKING_LOOKBACK);
        if (hasTrackingComment(lines.slice(start, i + 1).join('\n'))) {
          continue;
        }

        violations.push({
          file,
          rule: 'skipped-tests-need-tracking',
          message: `Line ${String(i + 1)}: \`${label}\` without a tracking comment. Add an issue URL or \`TODO(@owner)\` on the same line or above so the skip has an owner.`,
        });
      }
    }
  }

  return violations;
}

/** Skipped tests must carry an issue URL or TODO(@owner) so the debt has an owner. */
export const skippedTestsNeedTrackingRule: IMetaRule = {
  id: 'skipped-tests-need-tracking',
  category: 'testing',
  description:
    'Skipped tests (.skip/.fixme/xit/xdescribe) must carry an issue URL or TODO(@owner).',
  run({ sourceFiles }: IMetaContext): IViolation[] {
    return checkSkippedTestsHaveTracking(sourceFiles);
  },
};
