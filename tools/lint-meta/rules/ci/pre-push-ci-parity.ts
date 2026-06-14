import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IMetaContext, IMetaRule, IViolation } from '../../types';

const MANIFEST_FILE = join('scripts', 'ci', 'pre-push.manifest.json');

interface IPrePushManifest {
  readonly ciWorkflow: string;
  readonly requiredCommands: readonly string[];
}

/*
 * The local pre-push hook (scripts/ci/pre-push.sh) must never run a weaker set
 * of checks than CI. The manifest (scripts/ci/pre-push.manifest.json) names the
 * workflow it mirrors and the exact command strings it runs; this rule fails if
 * any of those strings is not present verbatim in that workflow. So a developer
 * who drops a gate from ci.yml but leaves it in pre-push (or vice versa) breaks
 * the build until the two agree, making "passes pre-push, fails CI" structurally
 * impossible.
 *
 * Dormant by design: with no manifest the rule returns [] (the hook is opt-in).
 * The match is a substring check, so every requiredCommand must appear as a
 * single unbroken `run:` line in the workflow -- a YAML line-wrap would defeat it.
 */
function parseManifest(file: string): IPrePushManifest | null {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<IPrePushManifest>;
    if (typeof parsed.ciWorkflow !== 'string' || !Array.isArray(parsed.requiredCommands)) {
      return null;
    }
    return { ciWorkflow: parsed.ciWorkflow, requiredCommands: parsed.requiredCommands };
  } catch {
    return null;
  }
}

export function checkPrePushCiParity(root: string): IViolation[] {
  const manifestFile = join(root, MANIFEST_FILE);
  if (!existsSync(manifestFile)) {
    return [];
  }

  const manifest = parseManifest(manifestFile);
  if (manifest === null) {
    return [
      {
        file: manifestFile,
        rule: 'pre-push-ci-parity',
        message:
          'pre-push.manifest.json is malformed. It must declare a string `ciWorkflow` and an array `requiredCommands`.',
      },
    ];
  }

  const workflowFile = join(root, manifest.ciWorkflow);
  if (!existsSync(workflowFile)) {
    return [
      {
        file: manifestFile,
        rule: 'pre-push-ci-parity',
        message: `Manifest \`ciWorkflow\` points at "${manifest.ciWorkflow}", which does not exist.`,
      },
    ];
  }

  const workflowText = readFileSync(workflowFile, 'utf8');

  return manifest.requiredCommands
    .filter(command => !workflowText.includes(command))
    .map(command => ({
      file: manifest.ciWorkflow,
      rule: 'pre-push-ci-parity',
      message: `pre-push manifest requires \`${command}\` but it does not appear in ${manifest.ciWorkflow}. Add it to CI or remove it from the manifest so pre-push and CI cannot diverge.`,
    }));
}

/** Every pre-push manifest command must appear verbatim in the CI workflow it mirrors. */
export const prePushCiParityRule: IMetaRule = {
  id: 'pre-push-ci-parity',
  category: 'ci',
  ciCritical: true,
  description: 'pre-push manifest commands must appear verbatim in the mirrored CI workflow.',
  run({ root }: IMetaContext): IViolation[] {
    return checkPrePushCiParity(root);
  },
};
