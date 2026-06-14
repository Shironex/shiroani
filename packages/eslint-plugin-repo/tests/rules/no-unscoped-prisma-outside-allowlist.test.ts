import { noUnscopedPrismaOutsideAllowlistRule } from '../../src/rules/no-unscoped-prisma-outside-allowlist';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('no-unscoped-prisma-outside-allowlist', noUnscopedPrismaOutsideAllowlistRule, {
  valid: [
    {
      // Unscoped client used inside an allowlisted seed file is legitimate.
      code: 'const rows = this.prisma.unscoped.firma.findMany();',
      filename: 'packages/database/prisma/seed.ts',
    },
    {
      // The escape hatch is allowed inside an isolation spec.
      code: 'runWithoutTenantScope(() => this.prisma.unscoped.firma.deleteMany());',
      filename: 'apps/api/src/modules/firma/firma.isolation.spec.ts',
    },
    {
      // The tenant-scoped client must NOT fire, even outside the allowlist.
      code: 'const rows = this.prisma.client.firma.findMany();',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
    },
    {
      // A method literally named `unscoped` on a non-prisma receiver is fine.
      code: 'const value = this.cache.unscoped();',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
    },
    {
      // Destructuring the SCOPED `client` is fine: it auto-scopes.
      code: 'const { client } = this.prismaService;',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
    },
    {
      // Destructuring `unscoped` off a non-prisma receiver is not our concern.
      code: 'const { unscoped } = this.somethingElse;',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
    },
    {
      // Destructuring the unscoped client inside an allowlisted isolation spec
      // is legitimate (the spec deliberately drives the raw client).
      code: 'const { unscoped } = this.prismaService;',
      filename: 'apps/api/src/modules/firma/firma.isolation.spec.ts',
    },
  ],
  invalid: [
    {
      // Branch (a): unscoped client on a `this.prisma` member receiver.
      code: 'const rows = this.prisma.unscoped.firma.findMany();',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      errors: [{ messageId: 'unscopedOutsideAllowlist' }],
    },
    {
      // Branch (a): unscoped client on a bare `prismaService` identifier receiver.
      code: 'const rows = prismaService.unscoped.firma.create({ data });',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      errors: [{ messageId: 'unscopedOutsideAllowlist' }],
    },
    {
      // Branch (b): the runWithoutTenantScope escape-hatch call.
      code: 'const rows = runWithoutTenantScope(() => tx.firma.findMany());',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      errors: [{ messageId: 'unscopedOutsideAllowlist' }],
    },
    {
      // A `*.system.ts` suffix is NOT an opt-out: the wildcard was removed from
      // the allowlist so a file cannot bypass the guard by renaming itself.
      code: 'const rows = this.prisma.unscoped.firma.findMany();',
      filename: 'apps/api/src/modules/foo/foo.system.ts',
      errors: [{ messageId: 'unscopedOutsideAllowlist' }],
    },
    {
      // Destructuring `unscoped` into a binding is the verified evasion: the
      // member-access matcher never sees `.unscoped`, so the destructure site
      // itself must be flagged.
      code: 'const { unscoped } = this.prismaService;',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      errors: [{ messageId: 'unscopedOutsideAllowlist' }],
    },
    {
      // A renamed destructure binding is the same evasion.
      code: 'const { unscoped: raw } = this.prismaService;',
      filename: 'apps/api/src/modules/foo/foo.service.ts',
      errors: [{ messageId: 'unscopedOutsideAllowlist' }],
    },
  ],
});
