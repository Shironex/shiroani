#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const localesRoot = resolve(root, 'apps/web/src/locales');
const baseLang = 'pl';
const otherLang = 'en';

function loadNamespace(lang, file) {
  const path = resolve(localesRoot, lang, file);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function listNamespaceFiles(lang) {
  const dir = resolve(localesRoot, lang);
  return readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .filter(name => statSync(resolve(dir, name)).isFile())
    .sort();
}

/**
 * Walks an arbitrary JSON tree and yields every leaf path as a dotted key.
 * Arrays are treated as leaves (rare in our locales; no current namespace
 * uses them, but a divergent shape itself is a parity issue worth surfacing).
 */
function collectKeys(node, prefix = '') {
  const keys = [];
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    keys.push(prefix);
    return keys;
  }
  for (const [k, v] of Object.entries(node)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectKeys(v, next));
    } else {
      keys.push(next);
    }
  }
  return keys;
}

function diffSets(a, b) {
  const setB = new Set(b);
  return a.filter(k => !setB.has(k)).sort();
}

const baseFiles = listNamespaceFiles(baseLang);
const otherFiles = listNamespaceFiles(otherLang);

const fileSet = new Set([...baseFiles, ...otherFiles]);

let totalMissing = 0;
const report = [];

for (const file of [...fileSet].sort()) {
  const inBase = baseFiles.includes(file);
  const inOther = otherFiles.includes(file);

  if (!inBase || !inOther) {
    totalMissing += 1;
    const which = !inBase ? `${baseLang}/${file}` : `${otherLang}/${file}`;
    report.push({
      namespace: basename(file, '.json'),
      file,
      kind: 'missing-namespace',
      detail: `missing ${which}`,
    });
    continue;
  }

  const baseTree = loadNamespace(baseLang, file);
  const otherTree = loadNamespace(otherLang, file);
  const baseKeys = collectKeys(baseTree);
  const otherKeys = collectKeys(otherTree);

  const onlyInBase = diffSets(baseKeys, otherKeys);
  const onlyInOther = diffSets(otherKeys, baseKeys);

  if (onlyInBase.length === 0 && onlyInOther.length === 0) continue;

  totalMissing += onlyInBase.length + onlyInOther.length;
  report.push({
    namespace: basename(file, '.json'),
    file,
    kind: 'key-divergence',
    onlyInBase,
    onlyInOther,
  });
}

if (totalMissing === 0) {
  console.log(`OK · all ${fileSet.size} namespaces are key-complete across ${baseLang}/${otherLang}`);
  process.exit(0);
}

console.log(`Locale parity report (${baseLang} vs ${otherLang})`);
console.log('-'.repeat(60));

let problemNamespaces = 0;
for (const entry of report) {
  problemNamespaces += 1;
  if (entry.kind === 'missing-namespace') {
    console.log(`\n[${entry.namespace}] ${entry.detail}`);
    continue;
  }
  console.log(`\n[${entry.namespace}] ${entry.file}`);
  if (entry.onlyInBase.length) {
    console.log(`  only in ${baseLang} (${entry.onlyInBase.length}):`);
    for (const key of entry.onlyInBase) console.log(`    + ${key}`);
  }
  if (entry.onlyInOther.length) {
    console.log(`  only in ${otherLang} (${entry.onlyInOther.length}):`);
    for (const key of entry.onlyInOther) console.log(`    - ${key}`);
  }
}

console.log('-'.repeat(60));
console.log(
  `FAIL · ${totalMissing} divergent key${totalMissing === 1 ? '' : 's'} across ${problemNamespaces} namespace${problemNamespaces === 1 ? '' : 's'}`
);
process.exit(1);
