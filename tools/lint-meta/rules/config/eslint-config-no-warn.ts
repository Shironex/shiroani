import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ESLint } from 'eslint';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

const RULE_ID = 'eslint-config-no-warn';
const WORKSPACE_GROUPS = ['apps', 'packages'] as const;
const CONFIG_BASENAMES = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.cjs'] as const;

/*
 * One probe per file shape ESLint actually lints. calculateConfigForFile does
 * pure glob matching, so the files need not exist; these shapes cover source
 * (.ts/.tsx) and test-file-scoped (.test.*) config blocks. A 'warn' anywhere in
 * any resolved block surfaces through at least one probe.
 */
const PROBE_RELATIVE_PATHS = [
  'src/__lint_meta_probe__.ts',
  'src/__lint_meta_probe__.tsx',
  'src/__lint_meta_probe__.test.ts',
  'src/__lint_meta_probe__.test.tsx',
] as const;

/** Normalize an ESLint severity (number | string | [severity, ...opts]) to 0/1/2. */
function severityToNumber(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 1 || raw === 'warn') {
    return 1;
  }
  if (raw === 2 || raw === 'error') {
    return 2;
  }
  return 0;
}

/** Every package directory under apps/* and packages/* that owns an eslint.config.*. */
function findPackageConfigDirs(root: string): string[] {
  const dirs: string[] = [];

  // Single-root flat config (ShiroAni): one repo-level eslint.config.* governs
  // every workspace, so probe it directly. Per-package configs (below) are also
  // collected for repos that use them.
  if (CONFIG_BASENAMES.some(name => existsSync(join(root, name)))) {
    dirs.push(root);
  }

  for (const group of WORKSPACE_GROUPS) {
    const groupDir = join(root, group);
    let entries: string[];
    try {
      entries = readdirSync(groupDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const pkgDir = join(groupDir, entry);
      if (!statSync(pkgDir).isDirectory()) {
        continue;
      }
      if (CONFIG_BASENAMES.some(name => existsSync(join(pkgDir, name)))) {
        dirs.push(pkgDir);
      }
    }
  }

  return dirs;
}

async function checkPackage(pkgDir: string, root: string): Promise<IViolation[]> {
  const rel = relative(root, pkgDir) || '(repo root)';
  // A fresh instance per package so ESLint discovers that package's own
  // eslint.config.* (flat config is single-rooted; it does not look downward).
  const eslint = new ESLint({ cwd: pkgDir, errorOnUnmatchedPattern: false });

  const warnRules = new Set<string>();
  let resolvedAny = false;
  let lastError: unknown;

  for (const probe of PROBE_RELATIVE_PATHS) {
    try {
      const config = await eslint.calculateConfigForFile(join(pkgDir, probe));
      resolvedAny = true;
      const rules = config.rules ?? {};
      for (const [ruleId, value] of Object.entries(rules)) {
        if (severityToNumber(value) === 1) {
          warnRules.add(ruleId);
        }
      }
    } catch (error) {
      lastError = error;
    }
  }

  // Fail closed: if the config could not be resolved at all, report it rather
  // than silently pass (a silent pass is the false-negative this rewrite kills).
  if (!resolvedAny) {
    return [
      {
        file: join(pkgDir, CONFIG_BASENAMES[0]),
        rule: RULE_ID,
        message: `Could not resolve the effective ESLint config for "${rel}" (run \`pnpm build:packages\` so @repo/eslint-* dist exists): ${String(lastError)}`,
      },
    ];
  }

  return [...warnRules].sort().map(ruleId => ({
    file: join(pkgDir, CONFIG_BASENAMES[0]),
    rule: RULE_ID,
    message: `Rule "${ruleId}" resolves to "warn" in "${rel}". ESLint severities must be "error" or "off", never "warn" (this is the RESOLVED severity, so it may come from a spread preset, not a literal in the config file). Override it explicitly.`,
  }));
}

export async function checkEslintConfigNoWarn(root: string): Promise<IViolation[]> {
  const results = await Promise.all(
    findPackageConfigDirs(root).map(pkgDir => checkPackage(pkgDir, root))
  );
  return results.flat();
}

/**
 * ESLint config severities must be error or off, never warn.
 *
 * Evaluates the RESOLVED flat config per package via ESLint's
 * `calculateConfigForFile`, so a severity injected by a spread preset object
 * (e.g. react-hooks `recommended-latest`, which ships rules at `warn`) is caught
 * even though no literal `"warn"` string appears in any config file. Async
 * because the ESLint config-resolution API is async.
 */
export const eslintConfigNoWarnRule: IMetaRule = {
  id: RULE_ID,
  category: 'config',
  description: 'ESLint severities must be "error" or "off", not "warn".',
  runAsync({ root }: IMetaContext): Promise<IViolation[]> {
    return checkEslintConfigNoWarn(root);
  },
};
