import { propsMustBeVisualRule } from '../../src/rules/props-must-be-visual';
import { ruleTester } from '../test-utils/ruleTester';

const FILE = 'apps/web/src/features/auth/components/LoginForm/LoginForm.tsx';

ruleTester.run('props-must-be-visual', propsMustBeVisualRule, {
  valid: [
    // Visual props.
    {
      code: `interface ILoginFormProps { label: string; disabled?: boolean; }`,
      filename: FILE,
    },
    // Non-Props interface is not a props surface.
    {
      code: `interface IAuthState { userId: string; token: string; }`,
      filename: FILE,
    },
    // Non-component files are not checked.
    {
      code: `interface IThingProps { token: string; }`,
      filename: 'apps/web/src/features/auth/Auth.types.ts',
    },
  ],
  invalid: [
    {
      code: `interface ILoginFormProps { userId: string; }`,
      filename: FILE,
      errors: [{ messageId: 'nonVisualProp' }],
    },
    {
      code: `interface ILoginFormProps { resetToken: string; }`,
      filename: FILE,
      errors: [{ messageId: 'nonVisualProp' }],
    },
    {
      code: `interface ILoginFormProps { currentUser: unknown; }`,
      filename: FILE,
      errors: [{ messageId: 'nonVisualProp' }],
    },
  ],
});
