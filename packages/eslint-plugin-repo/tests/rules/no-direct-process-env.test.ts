import { noDirectProcessEnvRule } from '../../src/rules/no-direct-process-env';
import { ruleTester } from '../test-utils/ruleTester';

const options = [{ allowedFiles: ['**/otel.ts', '**/*.{spec,test}.{ts,tsx}'] }] as const;

ruleTester.run('no-direct-process-env', noDirectProcessEnvRule, {
  valid: [
    {
      code: "const port = this.configService.get('PORT');",
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      options,
    },
    // Allowlisted bootstrap file may read process.env directly.
    {
      code: "const name = process.env.OTEL_SERVICE_NAME ?? 'api';",
      filename: 'apps/api/src/otel.ts',
      options,
    },
    // Allowlisted test file may stub env.
    {
      code: "process.env.NODE_ENV = 'production';",
      filename: 'apps/api/src/modules/events/events.gateway.spec.ts',
      options,
    },
    {
      code: 'const local = process.environment;',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      options,
    },
  ],
  invalid: [
    {
      code: "const isProd = process.env.NODE_ENV === 'production';",
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      options,
      errors: [{ messageId: 'directProcessEnv' }],
    },
    {
      code: 'const { DATABASE_URL } = process.env;',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      options,
      errors: [{ messageId: 'directProcessEnv' }],
    },
    {
      code: "const v = process.env['CORS_ORIGINS'];",
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      options,
      errors: [{ messageId: 'directProcessEnv' }],
    },
  ],
});
