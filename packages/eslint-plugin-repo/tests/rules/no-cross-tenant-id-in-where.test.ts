import { noCrossTenantIdInWhereRule } from '../../src/rules/no-cross-tenant-id-in-where';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('no-cross-tenant-id-in-where', noCrossTenantIdInWhereRule, {
  valid: [
    // tenantId from getTenantId() (trusted call).
    {
      code: `this.prisma.client.firma.findMany({ where: { tenantId: getTenantId() } });`,
    },
    // tenantId from ctx.tenantId (trusted server context).
    {
      code: `this.prisma.client.firma.findFirst({ where: { tenantId: ctx.tenantId } });`,
    },
    // tenantId from store.tenantId (trusted, deeper chain).
    {
      code: `tx.firma.update({ where: { tenantId: store.scope.tenantId }, data: { name } });`,
    },
    // data block sourced from session.tenantId (trusted).
    {
      code: `this.prisma.client.firma.create({ data: { tenantId: session.tenantId, name } });`,
    },
    // Not a tenant model: untrusted source on `user` is not policed by this rule.
    {
      code: `this.prisma.client.user.findMany({ where: { tenantId: input.tenantId } });`,
    },
    // Not a Prisma method on the tenant model.
    {
      code: `this.prisma.client.firma.validate({ where: { tenantId: input.tenantId } });`,
    },
    // No where/data object -> nothing to inspect.
    {
      code: `this.prisma.client.firma.findMany();`,
    },
    // where present but no tenantId field.
    {
      code: `this.prisma.client.firma.findMany({ where: { name: input.name } });`,
    },
    // tenantId is a literal, not a client member chain.
    {
      code: `this.prisma.client.firma.findMany({ where: { tenantId: 42 } });`,
    },
  ],
  invalid: [
    // Canonical IDOR: tenantId from input.tenantId in a where.
    {
      code: `this.prisma.client.firma.findMany({ where: { tenantId: input.tenantId } });`,
      errors: [{ messageId: 'untrustedTenantSource' }],
    },
    // dto.tenantId in a data block on a create.
    {
      code: `this.prisma.client.firma.create({ data: { tenantId: dto.tenantId, name } });`,
      errors: [{ messageId: 'untrustedTenantSource' }],
    },
    // Deeper untrusted chain: req.body.tenantId.
    {
      code: `tx.firma.update({ where: { tenantId: req.body.tenantId }, data: { name } });`,
      errors: [{ messageId: 'untrustedTenantSource' }],
    },
    // params root on a bare tenant-model receiver.
    {
      code: `firma.deleteMany({ where: { tenantId: params.tenantId } });`,
      errors: [{ messageId: 'untrustedTenantSource' }],
    },
    // body root, string-keyed properties still match.
    {
      code: `this.prisma.client.firma.upsert({ where: { 'tenantId': body.tenantId } });`,
      errors: [{ messageId: 'untrustedTenantSource' }],
    },
  ],
});
