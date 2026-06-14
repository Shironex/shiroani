import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

const RULE_ID = 'launch-path-parity';
const API_DIR = join('apps', 'api');

/*
 * nest build -b swc emits the entrypoint under dist/<sourceRoot>/ (swc ignores
 * tsconfig rootDir, so the dist mirrors the source tree from sourceRoot). Every
 * launch reference -- package.json (main/exports/start/start:prod), the prod
 * Dockerfile CMD, and any `node .../main.js` invocation in ci.yml -- must point
 * at that real emitted path. A drift here is exactly the MODULE_NOT_FOUND boot
 * defect this guard exists to prevent (the launch path said dist/main.js while
 * swc emitted dist/src/main.js).
 */

function readJson(path: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function resolveSourceRoot(root: string): string {
  const nestCli = readJson(join(root, API_DIR, 'nest-cli.json'));
  const sourceRoot = nestCli?.['sourceRoot'];
  return typeof sourceRoot === 'string' && sourceRoot.length > 0 ? sourceRoot : 'src';
}

function violation(file: string, message: string): IViolation {
  return { file, rule: RULE_ID, message };
}

function checkPackageJson(root: string, pkgRelEntry: string): IViolation[] {
  const file = join(root, API_DIR, 'package.json');
  const pkg = readJson(file);
  if (!pkg) {
    return [violation(file, 'apps/api/package.json is missing or unparseable.')];
  }

  const out: IViolation[] = [];
  const expectedJs = pkgRelEntry; // e.g. dist/src/main.js
  const expectedNoExt = pkgRelEntry.replace(/\.js$/u, ''); // e.g. dist/src/main

  if (pkg['main'] !== expectedJs) {
    out.push(
      violation(file, `"main" is ${JSON.stringify(pkg['main'])}, expected "${expectedJs}".`)
    );
  }

  const exportsField = pkg['exports'];
  const dotExport =
    exportsField && typeof exportsField === 'object'
      ? (exportsField as Record<string, unknown>)['.']
      : undefined;
  const dotDefault =
    dotExport && typeof dotExport === 'object'
      ? (dotExport as Record<string, unknown>)['default']
      : undefined;
  if (dotDefault !== `./${expectedJs}`) {
    out.push(
      violation(
        file,
        `exports["."].default is ${JSON.stringify(dotDefault)}, expected "./${expectedJs}".`
      )
    );
  }

  const scripts =
    pkg['scripts'] && typeof pkg['scripts'] === 'object'
      ? (pkg['scripts'] as Record<string, unknown>)
      : {};
  for (const scriptName of ['start', 'start:prod']) {
    const value = scripts[scriptName];
    if (typeof value !== 'string' || !value.includes(expectedNoExt)) {
      out.push(
        violation(
          file,
          `script "${scriptName}" is ${JSON.stringify(value)}, expected it to launch "${expectedNoExt}".`
        )
      );
    }
  }

  return out;
}

function checkDockerfile(root: string, repoRelEntry: string): IViolation[] {
  const file = join(root, API_DIR, 'Dockerfile');
  if (!existsSync(file)) {
    return [];
  }
  const text = readFileSync(file, 'utf8');

  // The runtime CMD is the one that runs node on a main.js. (The builder stage's
  // migrate CMD runs prisma, not node, so it is naturally excluded.)
  const nodeMainPaths = [...text.matchAll(/node["',\s]+([^"'\s]*main\.js)/gu)].map(m => m[1]);
  if (nodeMainPaths.length === 0) {
    return [violation(file, 'No `node .../main.js` CMD found in the Dockerfile.')];
  }

  return nodeMainPaths
    .filter(path => path !== repoRelEntry)
    .map(path => violation(file, `Dockerfile launches "${path}", expected "${repoRelEntry}".`));
}

function checkWorkflows(workflowFiles: readonly string[], repoRelEntry: string): IViolation[] {
  const out: IViolation[] = [];

  for (const file of workflowFiles) {
    const text = readFileSync(file, 'utf8');
    const nodeMainPaths = [...text.matchAll(/node\s+([^\s"']*api\/dist\/[^\s"']*main\.js)/gu)].map(
      m => m[1]
    );
    for (const path of nodeMainPaths) {
      if (path !== repoRelEntry) {
        out.push(violation(file, `CI boots the API with "${path}", expected "${repoRelEntry}".`));
      }
    }
  }

  return out;
}

export function checkLaunchPathParity(ctx: IMetaContext): IViolation[] {
  const sourceRoot = resolveSourceRoot(ctx.root);
  const pkgRelEntry = `dist/${sourceRoot}/main.js`;
  const repoRelEntry = `apps/api/${pkgRelEntry}`;

  return [
    ...checkPackageJson(ctx.root, pkgRelEntry),
    ...checkDockerfile(ctx.root, repoRelEntry),
    ...checkWorkflows(ctx.workflowFiles, repoRelEntry),
  ];
}

/** apps/api launch references must match the swc-emitted dist/<sourceRoot>/main.js. */
export const launchPathParityRule: IMetaRule = {
  id: RULE_ID,
  category: 'ci',
  description:
    'apps/api launch path (package.json/Dockerfile/CI) must match the emitted entrypoint.',
  ciCritical: true,
  run(ctx: IMetaContext): IViolation[] {
    return checkLaunchPathParity(ctx);
  },
};
