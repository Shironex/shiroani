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

const CLDR_CATEGORIES = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

function pluralCategoriesFor(lang) {
  return new Set(new Intl.PluralRules(lang).resolvedOptions().pluralCategories);
}

const basePluralCategories = pluralCategoriesFor(baseLang);
const otherPluralCategories = pluralCategoriesFor(otherLang);

/**
 * Returns the CLDR plural category a key represents, or null if it isn't a
 * plural-variant key. Handles both styles:
 *   suffix  — "key_few", "key_many"  (last segment ends with _<category>)
 *   nested  — "parent.few", "parent.many"  (last segment IS a category name)
 */
function pluralCategory(key) {
  const lastSeg = key.split('.').pop();
  // nested style: the last segment itself is a category name
  if (CLDR_CATEGORIES.has(lastSeg)) return lastSeg;
  // suffix style: the last segment ends with _<category>
  for (const cat of CLDR_CATEGORIES) {
    if (lastSeg.endsWith(`_${cat}`)) return cat;
  }
  return null;
}

/**
 * Given keys only present in `sourceLang` (and absent in `targetLang`),
 * partitions them into real divergences and CLDR-correct asymmetries.
 * A key is a CLDR-correct asymmetry when it is a plural variant for a
 * category that `targetLang` legitimately doesn't require.
 */
function partitionPluralKeys(keys, targetLangCategories) {
  const real = [];
  let cldrSkipped = 0;
  for (const key of keys) {
    const cat = pluralCategory(key);
    if (cat !== null && !targetLangCategories.has(cat)) {
      cldrSkipped++;
    } else {
      real.push(key);
    }
  }
  return { real, cldrSkipped };
}

function diffSets(a, b) {
  const setB = new Set(b);
  return a.filter(k => !setB.has(k)).sort();
}

const baseFiles = listNamespaceFiles(baseLang);
const otherFiles = listNamespaceFiles(otherLang);

const fileSet = new Set([...baseFiles, ...otherFiles]);

let totalMissing = 0;
let totalCldrSkipped = 0;
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

  const rawOnlyInBase = diffSets(baseKeys, otherKeys);
  const rawOnlyInOther = diffSets(otherKeys, baseKeys);

  const { real: onlyInBase, cldrSkipped: skippedFromBase } = partitionPluralKeys(rawOnlyInBase, otherPluralCategories);
  const { real: onlyInOther, cldrSkipped: skippedFromOther } = partitionPluralKeys(rawOnlyInOther, basePluralCategories);
  const nsSkipped = skippedFromBase + skippedFromOther;
  totalCldrSkipped += nsSkipped;

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
  if (totalCldrSkipped > 0) {
    console.log(`(skipped CLDR-correct asymmetry: ${totalCldrSkipped} plural variant${totalCldrSkipped === 1 ? '' : 's'})`);
  }
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
