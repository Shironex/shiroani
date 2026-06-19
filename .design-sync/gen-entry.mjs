#!/usr/bin/env node
// Generate the DS barrel entry for the converter (--entry).
//
// apps/web is the web APPLICATION, not a published component library: there is
// no dist/ and no barrel exporting components as window.<Global>.*. This script
// synthesizes one. It reads the built Storybook index.json (canonical title +
// story-file path per component), parses each story file for the component it
// renders, and emits `apps/web/.ds-entry/index.tsx` re-exporting every storied
// component under its Storybook-title name. A sibling package.json points
// `types`/`module` at the barrel so the converter's PKG_DIR walk + ts-morph
// export scan resolve against it.
//
// Re-run whenever stories are added/removed (a re-sync step). Output is
// committed (durable). Idempotent.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const WEB = resolve('apps/web');
const SRC = join(WEB, 'src');
const INDEX = resolve('.design-sync/sb-reference/index.json');
const OUT_DIR = join(WEB, '.ds-entry');
const OUT = join(OUT_DIR, 'index.tsx');

if (!existsSync(INDEX)) {
  console.error(`[gen-entry] ${INDEX} not found — build the reference storybook first.`);
  process.exit(1);
}

const idx = JSON.parse(readFileSync(INDEX, 'utf8'));
const stories = Object.values(idx.entries ?? idx.stories ?? {}).filter(e =>
  e.type === 'story' || e.type === 'docs' ? e.type === 'story' : true
);

// title -> story importPath (first story wins; all stories of a title share a file)
const byTitle = new Map();
for (const e of stories) {
  if (e.type && e.type !== 'story') continue;
  if (!byTitle.has(e.title)) byTitle.set(e.title, e.importPath);
}

// Resolve a module specifier used inside a story file to an on-disk module path.
function resolveSpec(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('@shiroani/'))
    return null; // workspace pkg, not a local component
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else return null; // bare package
  for (const ext of ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts']) {
    if (existsSync(base + ext)) return base + ext;
  }
  return base + '.tsx';
}

const importsList = [];
const exportsList = [];
const starExports = new Set();
const skipped = [];
const seenNames = new Set();

for (const [title, importPath] of byTitle) {
  const name = title.split('/').pop().trim();
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    skipped.push([title, 'name not PascalCase']);
    continue;
  }
  if (seenNames.has(name)) {
    skipped.push([title, `duplicate name ${name}`]);
    continue;
  }

  const storyFile = resolve(WEB, importPath.replace(/^\.\//, ''));
  if (!existsSync(storyFile)) {
    skipped.push([title, `story file missing: ${importPath}`]);
    continue;
  }
  const code = readFileSync(storyFile, 'utf8');

  // Find the component identifier the meta renders.
  const compMatch = code.match(/component:\s*([A-Za-z_$][\w$]*)/);
  const compId = compMatch ? compMatch[1] : name;

  // Find the import that binds compId.
  let spec = null,
    isDefault = false,
    importedName = compId;
  // default import: `import Foo from '...'`
  const defRe = new RegExp(
    `import\\s+${compId}\\s*(?:,\\s*\\{[^}]*\\})?\\s+from\\s+['"]([^'"]+)['"]`
  );
  const defM = code.match(defRe);
  if (defM) {
    spec = defM[1];
    isDefault = true;
  }
  if (!spec) {
    // named import: `import { ..., Foo, ... } from '...'` (also `Foo as Bar`)
    const namedRe = new RegExp(
      `import\\s+(?:[A-Za-z_$][\\w$]*\\s*,\\s*)?\\{([^}]*\\b${compId}\\b[^}]*)\\}\\s+from\\s+['"]([^'"]+)['"]`
    );
    const nm = code.match(namedRe);
    if (nm) {
      spec = nm[2];
      // handle `Real as compId`
      const aliasM = nm[1].match(new RegExp(`([A-Za-z_$][\\w$]*)\\s+as\\s+${compId}`));
      importedName = aliasM ? aliasM[1] : compId;
    }
  }
  if (!spec) {
    skipped.push([title, `no import found for ${compId}`]);
    continue;
  }

  const modPath = resolveSpec(spec, storyFile);
  if (!modPath) {
    skipped.push([title, `unresolvable spec ${spec}`]);
    continue;
  }
  let rel = relative(OUT_DIR, modPath)
    .replace(/\\/g, '/')
    .replace(/\.(tsx|ts|jsx|js)$/, '');
  if (!rel.startsWith('.')) rel = './' + rel;

  // Route EVERY export through a local `const`, which is always a
  // VariableDeclaration the converter's ts-morph export scan counts. Direct
  // re-export specifiers (`export { default as X }` / `export { X }`) fail the
  // scan whenever the chain ends at an `export default memo(...)` /
  // `forwardRef(...)` ExportAssignment — common here and even reachable through
  // an `index.ts` re-export hop.
  if (isDefault) {
    importsList.push(`import _${name} from '${rel}';`);
  } else {
    importsList.push(`import { ${importedName} as _${name} } from '${rel}';`);
  }
  exportsList.push(`export const ${name} = _${name};`);
  // Also re-export co-located named exports (sub-components / variants) from
  // the same module. Rule 2 of story-imports shims the whole module to the
  // global when a story imports a sibling from it (e.g. SettingsToggleRow from
  // SettingsCard's index), so those names must exist on the global. The
  // explicit `export const ${name}` above wins over the star for the primary.
  starExports.add(rel);
  seenNames.add(name);
}

importsList.sort();
exportsList.sort();
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT,
  `// AUTO-GENERATED by .design-sync/gen-entry.mjs — do not edit by hand.\n` +
    `// Barrel of all storied ShiroAni web components for the design-sync converter.\n` +
    // DesignProvider (hand-authored) supplies the preview context the Storybook\n
    // decorators provided; cfg.provider points at it.
    `export { DesignProvider } from './DesignProvider';\n` +
    (importsList.length ? importsList.join('\n') + '\n' : '') +
    exportsList.join('\n') +
    '\n' +
    [...starExports]
      .sort()
      .map(r => `export * from '${r}';`)
      .join('\n') +
    '\n'
);
writeFileSync(
  join(OUT_DIR, 'package.json'),
  JSON.stringify(
    {
      name: '@shiroani/web-ds',
      private: true,
      type: 'module',
      types: './index.tsx',
      module: './index.tsx',
    },
    null,
    2
  ) + '\n'
);

console.error(`[gen-entry] wrote ${exportsList.length} exports → ${relative(process.cwd(), OUT)}`);
if (skipped.length) {
  console.error(`[gen-entry] skipped ${skipped.length}:`);
  for (const [t, why] of skipped) console.error(`  - ${t}: ${why}`);
}
