import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// pnpm runs package scripts from the repo root, so cwd is the repo root.
export const repoRoot = process.cwd();

/** `LoginForm` / `login form` / `login_form` -> `login-form`. */
export function toKebab(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/** `login-form` / `billing` -> `LoginForm` / `Billing`. */
export function toPascal(input: string): string {
  return input
    .replace(/[-_\s]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/** `LoginForm` -> `LOGIN_FORM`. */
export function toScreamingSnake(input: string): string {
  return toKebab(input).replace(/-/g, '_').toUpperCase();
}

export function fail(message: string): never {
  console.error(`\n  error: ${message}\n`);
  process.exit(1);
}

export function assertPascalCase(name: string, label: string): void {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    fail(`${label} must be PascalCase, e.g. "InvoiceTable" (got "${name}")`);
  }
}

/** Write a new file, creating parent dirs. Refuses to overwrite. */
export function writeNew(relPath: string, contents: string): void {
  const abs = join(repoRoot, relPath);
  if (existsSync(abs)) {
    fail(`refusing to overwrite existing file: ${relPath}`);
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
  console.log(`  created  ${relPath}`);
}
