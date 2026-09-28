import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

/**
 * Lets E2E tests and isolated dev runs point `userData` somewhere else by
 * setting ELECTRON_USER_DATA_DIR.
 *
 * electron-store (`./store`) and the file logger resolve `userData` as soon as
 * their modules are evaluated, so the override has to run as a side effect of
 * the FIRST import in `main/index.ts`. Setting it later in the body of
 * index.ts leaves those modules writing to the real profile.
 */
export function applyUserDataOverride(env: NodeJS.ProcessEnv = process.env): string | null {
  const dir = env.ELECTRON_USER_DATA_DIR?.trim();
  if (!dir) return null;

  const resolved = path.resolve(dir);
  fs.mkdirSync(resolved, { recursive: true });
  app.setPath('userData', resolved);
  return resolved;
}

applyUserDataOverride();
