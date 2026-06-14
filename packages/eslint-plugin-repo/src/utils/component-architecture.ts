import path from 'node:path';

import micromatch from 'micromatch';

import { toRepoRelative } from './allowlist';

/*
 * Shared helpers for the frontend component-architecture rules. Paths are
 * matched against the monorepo-root-relative, forward-slashed form (via
 * `toRepoRelative`) so a rule behaves identically whether ESLint runs from the
 * repo root (lint-staged) or per-package (turbo).
 */

/** Default feature root, relative to a frontend package (e.g. `apps/web`). */
export const DEFAULT_FEATURES_DIR = 'src/features';

/** Forward-slashed basename of a file (e.g. `LoginForm.tsx`). */
export function getBasename(filename: string): string {
  return path.basename(filename);
}

/**
 * True for a component entry file: a single PascalCase segment then `.tsx`
 * (`LoginForm.tsx`). Sidecars carry an extra dotted segment
 * (`LoginForm.hooks.ts`, `LoginForm.stories.tsx`, `LoginForm.test.tsx`) and are
 * intentionally excluded, as are kebab-case files (`login-form.tsx`).
 */
export function isComponentFileName(filename: string): boolean {
  return /^[A-Z][A-Za-z0-9]*\.tsx$/.test(getBasename(filename));
}

/** Component name for a component file (`LoginForm.tsx` -> `LoginForm`). */
export function getComponentName(filename: string): string {
  return getBasename(filename).replace(/\.tsx$/, '');
}

/** True when the directory segment is PascalCase (a component folder name). */
export function isPascalCase(segment: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(segment);
}

/**
 * The feature a file belongs to, or `null` when it is not under `<featuresDir>`.
 * `apps/web/src/features/auth/components/LoginForm/LoginForm.tsx` -> `auth`.
 */
export function getFeatureName(
  filename: string,
  featuresDir: string = DEFAULT_FEATURES_DIR
): string | null {
  const rel = toRepoRelative(filename);
  const marker = `/${featuresDir}/`;
  const idx = rel.indexOf(marker);
  if (idx === -1) {
    return null;
  }
  const after = rel.slice(idx + marker.length);
  const segment = after.split('/')[0] ?? '';
  return segment.length > 0 ? segment : null;
}

/** True when the file matches one of the ignore globs (monorepo-root-relative). */
export function isIgnoredPath(filename: string, ignorePaths: readonly string[]): boolean {
  if (ignorePaths.length === 0) {
    return false;
  }
  return micromatch.isMatch(toRepoRelative(filename), [...ignorePaths], { dot: true });
}

/** True for a feature data file whose hook count `max-hooks-per-file` bounds. */
export function isHookBucketFile(filename: string): boolean {
  return /\.(queries|hooks|mutations)\.tsx?$/.test(getBasename(filename));
}
