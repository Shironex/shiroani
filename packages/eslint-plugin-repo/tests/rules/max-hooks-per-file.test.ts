import { maxHooksPerFileRule } from '../../src/rules/max-hooks-per-file';
import { ruleTester } from '../test-utils/ruleTester';

const QUERIES = 'apps/web/src/features/dashboard/Dashboard.queries.ts';

const fourHooks = `
export function useA() { return 1; }
export function useB() { return 2; }
export const useC = () => 3;
export const useD = () => 4;
`;

const fiveHooks = `${fourHooks}
export function useE() { return 5; }
`;

ruleTester.run('max-hooks-per-file', maxHooksPerFileRule, {
  valid: [
    // Exactly the max is fine.
    { code: fourHooks, filename: QUERIES },
    // Non-bucket files are not constrained even with many hooks.
    { code: fiveHooks, filename: 'apps/web/src/features/dashboard/Dashboard.util.ts' },
    // Non-exported helpers do not count.
    {
      code: `function useInternal() { return 0; }\nexport function usePublic() { return 1; }`,
      filename: QUERIES,
    },
  ],
  invalid: [{ code: fiveHooks, filename: QUERIES, errors: [{ messageId: 'tooManyHooks' }] }],
});
