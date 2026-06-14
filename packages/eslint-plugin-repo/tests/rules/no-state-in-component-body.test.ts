import { noStateInComponentBodyRule } from '../../src/rules/no-state-in-component-body';
import { ruleTester } from '../test-utils/ruleTester';

const COMPONENT = 'apps/web/src/features/dashboard/components/Widget/Widget.tsx';
const HOOK = 'apps/web/src/features/dashboard/components/Widget/Widget.hooks.ts';

ruleTester.run('no-state-in-component-body', noStateInComponentBodyRule, {
  valid: [
    // Render-safe hooks are allowlisted.
    {
      code: `import { useId } from 'react';\nexport default function Widget() { const id = useId(); return null; }`,
      filename: COMPONENT,
    },
    // Non-flagged hooks (router, custom presentational) are fine in the shell.
    {
      code: `export default function Widget({ view }: { view: unknown }) { return null; }`,
      filename: COMPONENT,
    },
    // The same hook is the correct home in a .hooks.ts file.
    {
      code: `import { useState } from 'react';\nexport function useWidget() { return useState(0); }`,
      filename: HOOK,
    },
  ],
  invalid: [
    {
      code: `import { useState } from 'react';\nexport default function Widget() { const [n] = useState(0); return null; }`,
      filename: COMPONENT,
      errors: [{ messageId: 'stateInBody' }],
    },
    {
      code: `export default function Widget() { const q = useQuery({}); return null; }`,
      filename: COMPONENT,
      errors: [{ messageId: 'stateInBody' }],
    },
    // Zustand store hook (use*Store) read in the body.
    {
      code: `export default function Widget() { const s = useSocketStore((x) => x); return null; }`,
      filename: COMPONENT,
      errors: [{ messageId: 'stateInBody' }],
    },
  ],
});
