import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

const CONFIG_BASENAME = /^eslint\.config\.(mjs|js|cjs|mts)$/u;
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage']);

/*
 * A quoted, workspace-relative path with a file extension and NO glob
 * metacharacters: the shape used by literal `files:` / `ignores:` overrides
 * (e.g. 'src/routeTree.gen.ts'). Glob entries contain `*`, `{`, or `!` and are
 * excluded by the negated character class, since they match zero-or-more files
 * by design.
 */
const LITERAL_PATH = /["']([^"'*?{}[\]!\s]+\/[^"'*?{}[\]!\s]+\.[a-z0-9]{1,5})["']/giu;

function findEslintConfigFiles(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry) || entry.startsWith('.')) {
        continue;
      }
      findEslintConfigFiles(full, out);
      continue;
    }

    if (stat.isFile() && CONFIG_BASENAME.test(entry)) {
      out.push(full);
    }
  }
}

export function checkEslintOverridePathsExist(root: string): IViolation[] {
  const violations: IViolation[] = [];
  const configFiles: string[] = [];
  findEslintConfigFiles(root, configFiles);

  for (const configFile of configFiles) {
    const configDir = dirname(configFile);
    const lines = readFileSync(configFile, 'utf8').split('\n');

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (raw === undefined) {
        continue;
      }
      const noLineComment = raw.replace(/\/\/.*$/u, '');

      for (const match of noLineComment.matchAll(LITERAL_PATH)) {
        const relPath = match[1];
        if (relPath !== undefined && !existsSync(join(configDir, relPath))) {
          violations.push({
            file: configFile,
            rule: 'eslint-override-paths-exist',
            message: `Line ${String(i + 1)}: override references \`${relPath}\`, which does not exist relative to this config. Remove the stale entry or restore the file.`,
          });
        }
      }
    }
  }

  return violations;
}

/** Literal (non-glob) paths in eslint.config.* files:/ignores: overrides must exist on disk. */
export const eslintOverridePathsExistRule: IMetaRule = {
  id: 'eslint-override-paths-exist',
  category: 'config',
  description: 'Literal file paths in eslint.config.* overrides must exist on disk.',
  run({ root }: IMetaContext): IViolation[] {
    return checkEslintOverridePathsExist(root);
  },
};
