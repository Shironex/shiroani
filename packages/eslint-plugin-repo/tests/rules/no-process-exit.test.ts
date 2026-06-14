import { noProcessExitRule } from '../../src/rules/no-process-exit';
import { ruleTester } from '../test-utils/ruleTester';

const options = [{ allowedFiles: ['**/otel.ts', '**/cli.ts'] }] as const;

ruleTester.run('no-process-exit', noProcessExitRule, {
  valid: [
    // Allowlisted CLI/bootstrap files may exit.
    {
      code: 'process.exit(1);',
      filename: 'tools/lint-meta/cli.ts',
      options,
    },
    {
      code: 'process.exit(0);',
      filename: 'apps/api/src/otel.ts',
      options,
    },
    // Not process.exit.
    {
      code: 'queue.exit(0);',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      options,
    },
    // Default allowlist covers the API bootstrap entrypoint (no options).
    {
      code: 'process.exit(1);',
      filename: 'apps/api/src/main.ts',
    },
  ],
  invalid: [
    {
      code: 'process.exit(1);',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      options,
      errors: [{ messageId: 'processExit' }],
    },
  ],
});
