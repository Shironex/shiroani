#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const localesRoot = resolve(root, 'apps/web/src/locales');
const baseLang = 'pl';
const otherLang = 'en';

// ---------------------------------------------------------------------------
// Helpers for TS inline-dict sources (landing + desktop main process)
// ---------------------------------------------------------------------------

/**
 * Extract the source text of a `<lang>: { … }` block from a TS source file
 * by balancing braces from the first `{` following the `<lang>: ` marker.
 */
function extractLangBlock(src, lang) {
  const marker = `${lang}: {`;
  const markerIdx = src.indexOf(marker);
  if (markerIdx === -1) return null;
  let depth = 0;
  let i = markerIdx + marker.length - 1; // at the opening '{'
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  return src.slice(markerIdx + marker.length - 1, i + 1);
}

/**
 * Extract all flat string-literal keys from a `Record<string, string>` block
 * (landing-page style). Matches `'some.key':` patterns.
 */
function extractFlatKeys(block) {
  const keys = [];
  const re = /'([^']+)'\s*:/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

/**
 * Walk a nested TS object literal block and collect dotted leaf-key paths.
 * Handles arbitrary nesting depth; treats any value that is NOT `{` as a leaf.
 */
function collectNestedLeafKeys(block, prefix) {
  const keys = [];
  // Scan at depth 0 (direct children of this block) only.
  let depth = 0;
  let i = 1; // skip opening '{'
  while (i < block.length - 1) {
    const c = block[i];
    if (c === '{' || c === '[') {
      depth++;
      i++;
      continue;
    }
    if (c === '}' || c === ']') {
      depth--;
      i++;
      continue;
    }
    if (depth !== 0) {
      i++;
      continue;
    }
    // At top level — try to match an identifier key.
    const propRe = /(\w+)\s*:/y;
    propRe.lastIndex = i;
    const m = propRe.exec(block);
    if (m) {
      const key = m[1];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      // Find the start of the value (skip whitespace after ':').
      let j = i + m[0].length;
      while (j < block.length && /\s/.test(block[j])) j++;
      if (block[j] === '{') {
        // Nested object — recurse.
        const nested = balancedBraceSlice(block, j);
        keys.push(...collectNestedLeafKeys(nested, fullKey));
        i = j + nested.length;
      } else {
        keys.push(fullKey);
        i = j + 1;
      }
    } else {
      i++;
    }
  }
  return keys;
}

/** Return the substring of `src` from `startIdx` through the matching `}`. */
function balancedBraceSlice(src, startIdx) {
  let depth = 0,
    i = startIdx;
  while (i < src.length) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }
  return src.slice(startIdx, i + 1);
}

/**
 * Check a single TypeScript inline-dict file.
 * Returns `{ label, onlyInBase, onlyInOther }` — both arrays empty means parity.
 *
 * @param {string} filePath  Absolute path to the TS file.
 * @param {'flat'|'nested'} shape  How to extract keys.
 * @param {string} label     Human-readable name for reporting.
 */
function checkTsInlineDict(filePath, shape, label) {
  const src = readFileSync(filePath, 'utf-8');
  const baseBlock = extractLangBlock(src, baseLang);
  const otherBlock = extractLangBlock(src, otherLang);

  if (!baseBlock || !otherBlock) {
    return {
      label,
      error: `Could not find language blocks for both '${baseLang}' and '${otherLang}' in ${filePath}`,
    };
  }

  const baseKeys =
    shape === 'flat'
      ? extractFlatKeys(baseBlock).sort()
      : collectNestedLeafKeys(baseBlock, '').sort();
  const otherKeys =
    shape === 'flat'
      ? extractFlatKeys(otherBlock).sort()
      : collectNestedLeafKeys(otherBlock, '').sort();

  const onlyInBase = diffSets(baseKeys, otherKeys);
  const onlyInOther = diffSets(otherKeys, baseKeys);
  return { label, onlyInBase, onlyInOther };
}

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

  const { real: onlyInBase, cldrSkipped: skippedFromBase } = partitionPluralKeys(
    rawOnlyInBase,
    otherPluralCategories
  );
  const { real: onlyInOther, cldrSkipped: skippedFromOther } = partitionPluralKeys(
    rawOnlyInOther,
    basePluralCategories
  );
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

// ---------------------------------------------------------------------------
// Inline-dict checks: landing page + desktop main process
// ---------------------------------------------------------------------------

const inlineDictChecks = [
  checkTsInlineDict(
    resolve(root, 'apps/landing/src/lib/i18n.ts'),
    'flat',
    'landing (apps/landing/src/lib/i18n.ts)'
  ),
  checkTsInlineDict(
    resolve(root, 'apps/desktop/src/main/i18n-strings.ts'),
    'nested',
    'desktop-main (apps/desktop/src/main/i18n-strings.ts)'
  ),
];

const inlineReport = [];
let totalInlineMissing = 0;

for (const result of inlineDictChecks) {
  if (result.error) {
    totalInlineMissing += 1;
    inlineReport.push(result);
    continue;
  }
  if (result.onlyInBase.length === 0 && result.onlyInOther.length === 0) continue;
  totalInlineMissing += result.onlyInBase.length + result.onlyInOther.length;
  inlineReport.push(result);
}

// ---------------------------------------------------------------------------
// Final summary
// ---------------------------------------------------------------------------

const overallMissing = totalMissing + totalInlineMissing;

if (overallMissing === 0) {
  console.log(
    `OK · all ${fileSet.size} namespaces are key-complete across ${baseLang}/${otherLang}`
  );
  if (totalCldrSkipped > 0) {
    console.log(
      `(skipped CLDR-correct asymmetry: ${totalCldrSkipped} plural variant${totalCldrSkipped === 1 ? '' : 's'})`
    );
  }
  console.log(`OK · landing inline dict is key-complete (${baseLang}/${otherLang})`);
  console.log(`OK · desktop main-process dict is key-complete (${baseLang}/${otherLang})`);
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

for (const result of inlineReport) {
  problemNamespaces += 1;
  if (result.error) {
    console.log(`\n[${result.label}] ${result.error}`);
    continue;
  }
  console.log(`\n[${result.label}]`);
  if (result.onlyInBase.length) {
    console.log(`  only in ${baseLang} (${result.onlyInBase.length}):`);
    for (const key of result.onlyInBase) console.log(`    + ${key}`);
  }
  if (result.onlyInOther.length) {
    console.log(`  only in ${otherLang} (${result.onlyInOther.length}):`);
    for (const key of result.onlyInOther) console.log(`    - ${key}`);
  }
}

console.log('-'.repeat(60));
console.log(
  `FAIL · ${overallMissing} divergent key${overallMissing === 1 ? '' : 's'} across ${problemNamespaces} source${problemNamespaces === 1 ? '' : 's'}`
);
process.exit(1);
