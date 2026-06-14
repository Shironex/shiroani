import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, repoRoot, toKebab, toScreamingSnake, writeNew } from './codegen-utils';

const raw = process.argv[2];
if (!raw) fail('usage: pnpm new:feature <name>');

const dir = toKebab(raw);
if (!/^[a-z][a-z0-9-]*$/.test(dir)) {
  fail(`feature name must be kebab-case, e.g. "social" (got "${raw}")`);
}

const base = `apps/web/src/components/${dir}`;
if (existsSync(join(repoRoot, base))) {
  fail(`feature "${dir}" already exists at ${base}`);
}

writeNew(`${base}/${dir}-constants.ts`, featureConstants(dir));

console.log(`\n  feature "${dir}" scaffolded. Add components with:`);
console.log(`    pnpm new:component ${dir}/<Name>\n`);

function featureConstants(name: string): string {
  return `// Frozen, feature-root constants shared across ${name} components.
export const ${toScreamingSnake(name)}_CONSTANTS = {} as const;
`;
}
