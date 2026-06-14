import { noCrossFeatureImportsRule } from '../../src/rules/no-cross-feature-imports';
import { ruleTester } from '../test-utils/ruleTester';

const FROM = 'apps/web/src/features/settings/components/ProfileSection/ProfileSection.tsx';

ruleTester.run('no-cross-feature-imports', noCrossFeatureImportsRule, {
  valid: [
    // Same feature.
    {
      code: `import { x } from '@/features/settings/Settings.queries';`,
      filename: FROM,
    },
    // Shared feature is importable by all.
    {
      code: `import { PasswordStrength } from '@/features/shared/components/PasswordStrength';`,
      filename: FROM,
    },
    // Type-only cross-feature import is allowed by default.
    {
      code: `import type { IAuthView } from '@/features/auth/Auth.types';`,
      filename: FROM,
    },
    // Non-feature imports (design system, lib) are fine.
    {
      code: `import { Button } from '@repo/ui/button';`,
      filename: FROM,
    },
    // Files outside any feature are not constrained.
    {
      code: `import { LoginForm } from '@/features/auth/components/LoginForm';`,
      filename: 'apps/web/src/routes/auth/login.tsx',
    },
  ],
  invalid: [
    // Runtime cross-feature import.
    {
      code: `import { PasswordStrength } from '@/features/auth/components/PasswordStrength';`,
      filename: FROM,
      errors: [{ messageId: 'crossFeatureImport' }],
    },
  ],
});
