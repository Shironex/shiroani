/**
 * Static checks for files ESLint can't parse as JavaScript:
 *
 *   pnpm lint:meta
 *   pnpm lint:meta --list-rules
 *   pnpm lint:meta:verify
 *
 * Rule catalog: tools/lint-meta/RULES.md
 * Exits non-zero on any violation. Runs in pre-push and CI.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildContext } from './context';
import { META_RULES } from './registry';
import { printRuleCatalog, runMetaRules, runMetaRulesAsync } from './runner';

const ROOT = resolve(process.cwd());

async function main(): Promise<void> {
  if (process.argv.includes('--list-rules')) {
    printRuleCatalog(META_RULES);
    return;
  }

  // Both passes always run. `--verify` is accepted (the lint:meta:verify script
  // passes it) but is now a no-op: async rules like eslint-config-no-warn, which
  // needs ESLint's resolved config, must run on every lint:meta, not only in CI.
  const ctx = buildContext(ROOT);

  const violations = [
    ...runMetaRules(META_RULES, ctx),
    ...(await runMetaRulesAsync(META_RULES, ctx)),
  ];

  if (violations.length === 0) {
    console.log('[lint:meta] No violations.');
    return;
  }

  console.error(`[lint:meta] ${String(violations.length)} violation(s):\n`);

  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`    ${v.rule}: ${v.message}\n`);
  }

  process.exit(1);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
