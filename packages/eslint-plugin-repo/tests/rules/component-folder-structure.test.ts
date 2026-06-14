import { componentFolderStructureRule } from '../../src/rules/component-folder-structure';
import { ruleTester } from '../test-utils/ruleTester';

const COMPONENT = `export default function Widget() { return null; }`;

ruleTester.run('component-folder-structure', componentFolderStructureRule, {
  valid: [
    // Kebab-case file is not a component entry file — skipped.
    {
      code: COMPONENT,
      filename: 'apps/web/src/features/dashboard/components/activity-feed.tsx',
    },
    // @repo/ui keeps the shadcn convention — excluded via ignorePaths.
    {
      code: COMPONENT,
      filename: 'packages/ui/src/components/Button.tsx',
    },
    // Component file outside src/features/** is not gated.
    {
      code: COMPONENT,
      filename: 'apps/web/src/components/Widget.tsx',
    },
  ],
  invalid: [
    // A component in src/features/** whose siblings are absent on disk.
    {
      code: COMPONENT,
      filename: 'apps/web/src/features/dashboard/components/Widget/Widget.tsx',
      errors: [{ messageId: 'missingSiblings' }],
    },
  ],
});
