import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { META_RULES } from './registry';

const LINT_META_DIR = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(LINT_META_DIR, 'RULES.md');

export interface IRuleCatalogRow {
  readonly id: string;
  readonly category: string;
  readonly ciCritical: boolean;
  readonly description: string;
}

export function buildRuleCatalog(): IRuleCatalogRow[] {
  return META_RULES.map(rule => ({
    id: rule.id,
    category: rule.category,
    ciCritical: rule.ciCritical === true,
    description: rule.description,
  }));
}

function formatAlignedMarkdownTable(
  headers: readonly string[],
  bodyRows: readonly (readonly string[])[]
): string {
  const widths = headers.map((header, columnIndex) =>
    Math.max(header.length, 3, ...bodyRows.map(row => row[columnIndex]?.length ?? 0))
  );

  const formatRow = (cells: readonly string[]): string =>
    `| ${cells.map((cell, columnIndex) => cell.padEnd(widths[columnIndex] ?? cell.length)).join(' | ')} |`;

  const separator = `| ${widths.map(width => '-'.repeat(width)).join(' | ')} |`;

  return [formatRow(headers), separator, ...bodyRows.map(formatRow)].join('\n');
}

function formatRulesTable(rows: IRuleCatalogRow[]): string {
  return formatAlignedMarkdownTable(
    ['Rule ID', 'Category', 'CI-critical', 'What it guards'],
    rows.map(row => [
      `\`${row.id}\``,
      row.category,
      row.ciCritical ? '**yes**' : 'no',
      row.description,
    ])
  );
}

export function renderRulesMd(): string {
  const rows = buildRuleCatalog();

  return `# lint:meta rule catalog

Run \`pnpm lint:meta --list-rules\` for the machine-readable list from the registry.

## Adding a rule

1. Pick a category folder under \`tools/lint-meta/rules/\`.
2. Export an \`IMetaRule\` object with \`id\`, \`category\`, \`description\`, and \`run(ctx)\`.
3. Register it in \`tools/lint-meta/registry.ts\`.
4. Run \`pnpm generate:lint-meta-docs\` to refresh this file.

## Rules

${formatRulesTable(rows)}
`;
}

export function main(checkMode = process.argv.includes('--check')): void {
  const content = renderRulesMd();

  if (checkMode) {
    const current = readFileSync(RULES_PATH, 'utf8');

    if (current !== content) {
      console.error(
        '[generate:lint-meta-docs] RULES.md is out of date — run pnpm generate:lint-meta-docs'
      );
      process.exit(1);
    }

    console.log('[generate:lint-meta-docs] RULES.md is up to date.');
    return;
  }

  writeFileSync(RULES_PATH, content, 'utf8');
  console.log(`[generate:lint-meta-docs] wrote ${RULES_PATH}`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
