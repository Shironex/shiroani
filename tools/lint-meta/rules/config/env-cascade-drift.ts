import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

const SCHEMA_FILE = join('apps', 'api', 'src', 'config', 'configuration.config.ts');
const ENV_EXAMPLE_FILE = '.env.example';

/** Joi keys are declared as `KEY: Joi.<...>` inside the validation schema. */
const JOI_KEY = /^\s*([A-Z][A-Z0-9_]*)\s*:\s*Joi\./u;

/** dotenv assignments: `KEY=value`, ignoring comments and blanks. */
const DOTENV_KEY = /^([A-Za-z_][A-Za-z0-9_]*)\s*=/u;

function parseJoiKeys(file: string): string[] {
  const keys: string[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = JOI_KEY.exec(line);
    if (match?.[1] !== undefined) {
      keys.push(match[1]);
    }
  }
  return keys;
}

function parseDotenvKeys(file: string): Set<string> {
  const keys = new Set<string>();
  for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      continue;
    }
    const match = DOTENV_KEY.exec(line);
    if (match?.[1] !== undefined) {
      keys.add(match[1]);
    }
  }
  return keys;
}

/*
 * Direction is schema -> .env.example only: every key the API's Joi schema
 * reads must be documented in .env.example so operators have a seed value. The
 * reverse (example key not in schema) is deliberately NOT checked: .env.example
 * is shared with the web build (VITE_*), docker-compose (POSTGRES_*,
 * REDIS_PASSWORD), and the observability stack (GRAFANA_*, *_RETENTION_*), none
 * of which the API ConfigService reads. Checking it would be all false
 * positives.
 */
export function checkEnvCascadeDrift(root: string): IViolation[] {
  const schemaFile = join(root, SCHEMA_FILE);
  const envExampleFile = join(root, ENV_EXAMPLE_FILE);

  if (!existsSync(schemaFile) || !existsSync(envExampleFile)) {
    return [];
  }

  const envKeys = parseDotenvKeys(envExampleFile);
  const violations: IViolation[] = [];

  for (const key of parseJoiKeys(schemaFile)) {
    if (!envKeys.has(key)) {
      violations.push({
        file: envExampleFile,
        rule: 'env-cascade-drift',
        message: `\`${key}\` is validated by the Joi schema (${SCHEMA_FILE}) but missing from .env.example. Add it so operators have a documented seed value.`,
      });
    }
  }

  return violations;
}

/** Every Joi env-schema key must be documented in .env.example. */
export const envCascadeDriftRule: IMetaRule = {
  id: 'env-cascade-drift',
  category: 'config',
  description: 'Joi env-schema keys must be documented in .env.example.',
  run({ root }: IMetaContext): IViolation[] {
    return checkEnvCascadeDrift(root);
  },
};
