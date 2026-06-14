import { noBareDateNowRule } from '../../src/rules/no-bare-date-now';
import { ruleTester } from '../test-utils/ruleTester';

const options = [{ allowedFiles: ['**/common/clock/clock.ts', '**/*.timing.ts'] }] as const;

ruleTester.run('no-bare-date-now', noBareDateNowRule, {
  valid: [
    // Clock util replacements.
    {
      code: `const t = nowMs();`,
      filename: 'apps/api/src/modules/auth/services/token.service.ts',
      options,
    },
    {
      code: `const d = now();`,
      filename: 'apps/api/src/modules/auth/services/token.service.ts',
      options,
    },
    // `new Date(value)` with an argument is a parse, not a bare read.
    {
      code: `const d = new Date(nowMs() + 1000);`,
      filename: 'apps/api/src/modules/auth/services/token.service.ts',
      options,
    },
    {
      code: `const d = new Date('2026-01-01T00:00:00Z');`,
      filename: 'apps/api/src/modules/auth/services/token.service.ts',
      options,
    },
    // Allowlisted files keep bare Date (the clock util and timing sites).
    {
      code: `export function nowMs() { return Date.now(); }`,
      filename: 'apps/api/src/common/clock/clock.ts',
      options,
    },
    {
      code: `const start = Date.now();`,
      filename: 'apps/api/src/modules/metrics/request.timing.ts',
      options,
    },
  ],
  invalid: [
    {
      code: `const t = Date.now();`,
      filename: 'apps/api/src/modules/auth/services/token.service.ts',
      options,
      errors: [{ messageId: 'dateNow' }],
    },
    {
      code: `const d = new Date();`,
      filename: 'apps/api/src/modules/auth/services/token.service.ts',
      options,
      errors: [{ messageId: 'newDate' }],
    },
  ],
});
