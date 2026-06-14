import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { assertPascalCase, fail, repoRoot, toKebab, writeNew } from './codegen-utils';

const arg = process.argv[2];
if (!arg || !arg.includes('/')) {
  fail('usage: pnpm new:component <feature>/<Name>   (or)   pnpm new:component ui/<Name>');
}

const slash = arg.indexOf('/');
const target = arg.slice(0, slash);
const rawName = arg.slice(slash + 1);
if (!rawName) fail('missing component name');

if (target === 'ui') {
  generateUiComponent(rawName);
} else {
  generateFeatureComponent(target, rawName);
}

// ---------------------------------------------------------------------------
// Feature component: the full 6-file folder convention under
// apps/web/src/components/<feature>/<Name>/ (D1 — featuresDir is src/components).
// ---------------------------------------------------------------------------

function generateFeatureComponent(feature: string, name: string): void {
  assertPascalCase(name, 'component name');
  if (!/^[a-z][a-z0-9-]*$/.test(feature)) {
    fail(`feature must be kebab-case, e.g. "social" (got "${feature}")`);
  }

  const featureDir = `apps/web/src/components/${feature}`;
  const isNewFeature = !existsSync(join(repoRoot, featureDir));
  const dir = `${featureDir}/${name}`;
  const kebab = toKebab(name);

  writeNew(`${dir}/${name}.tsx`, componentShell(name, kebab));
  writeNew(`${dir}/${name}.hooks.ts`, componentHooks(name));
  writeNew(`${dir}/${name}.types.ts`, componentTypes(name));
  writeNew(`${dir}/${name}.stories.tsx`, componentStories(name, feature));
  writeNew(`${dir}/${name}.test.tsx`, componentTest(name));
  writeNew(`${dir}/index.ts`, componentBarrel(name));

  const note = isNewFeature ? ` (new feature folder "${feature}")` : '';
  console.log(
    `\n  ${name} scaffolded under components/${feature}${note}. Wire it up from its parent.\n`
  );
}

function componentShell(name: string, kebab: string): string {
  return `import { cn } from '@/lib/utils';
import { use${name} } from './${name}.hooks';

export default function ${name}() {
  const { label } = use${name}();
  const containerClass = cn('flex flex-col gap-2');

  return (
    <div className={containerClass} data-slot="${kebab}">
      {label}
    </div>
  );
}
`;
}

function componentHooks(name: string): string {
  return `import type { I${name}View } from './${name}.types';

export function use${name}(): I${name}View {
  // Own this component's state, effects, Zustand selectors (use*Store), and any
  // socket/IPC reads here so ${name} stays a thin presentational shell. For
  // backend or socket calls, add a sibling ${name}.ipc.ts and consume it here.
  return { label: '${name}' };
}
`;
}

function componentTypes(name: string): string {
  return `export interface I${name}View {
  readonly label: string;
}
`;
}

function componentStories(name: string, feature: string): string {
  return `import type { Meta, StoryObj } from '@storybook/react-vite';
import ${name} from './${name}';

const meta: Meta<typeof ${name}> = {
  title: '${feature}/${name}',
  component: ${name},
};

export default meta;

type Story = StoryObj<typeof ${name}>;

export const Default: Story = {};
`;
}

function componentTest(name: string): string {
  return `import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ${name} from './${name}';

describe('${name}', () => {
  it('renders', () => {
    render(<${name} />);
    expect(screen.getByText('${name}')).toBeInTheDocument();
  });
});
`;
}

function componentBarrel(name: string): string {
  return `export { default as ${name} } from './${name}';
export * from './${name}.types';
`;
}

// ---------------------------------------------------------------------------
// UI component: a single-file shadcn-style primitive under components/ui.
// Excluded from the architecture rules, so no sibling set.
// ---------------------------------------------------------------------------

function generateUiComponent(name: string): void {
  assertPascalCase(name, 'component name');
  const kebab = toKebab(name);

  writeNew(`apps/web/src/components/ui/${kebab}.tsx`, uiComponent(name, kebab));

  console.log(
    `\n  ${name} scaffolded in components/ui. Import it from '@/components/ui/${kebab}'.\n`
  );
}

function uiComponent(name: string, kebab: string): string {
  return `import * as React from 'react';

import { cn } from '@/lib/utils';

interface I${name}Props extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional visual label. */
  label?: string;
}

function ${name}({ className, label, ...props }: I${name}Props) {
  return (
    <div data-slot="${kebab}" className={cn('inline-flex items-center', className)} {...props}>
      {label}
    </div>
  );
}

export { ${name}, type I${name}Props };
`;
}
