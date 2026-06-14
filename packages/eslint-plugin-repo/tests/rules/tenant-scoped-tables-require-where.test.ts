import { tenantScopedTablesRequireWhereRule } from '../../src/rules/tenant-scoped-tables-require-where';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('tenant-scoped-tables-require-where', tenantScopedTablesRequireWhereRule, {
  valid: [
    // Unscoped client with tenantId shorthand in where: compliant.
    {
      code: 'this.prisma.unscoped.firma.findMany({ where: { tenantId } });',
    },
    // Unscoped client with explicit tenantId value in where: compliant.
    {
      code: 'this.prisma.unscoped.firma.findFirst({ where: { tenantId: ctx.tenantId, name } });',
    },
    // Extended (request-path) client auto-injects tenantId: exempt.
    {
      code: 'this.prisma.client.firma.findMany({});',
    },
    // Extended client with no args at all: exempt (no `unscoped` in chain).
    {
      code: 'this.prisma.client.firma.deleteMany();',
    },
    // Non-tenant model on the unscoped client: not policed.
    {
      code: "this.prisma.unscoped.user.findMany({ where: { email: 'x' } });",
    },
    // findUnique is exempt even on the unscoped client.
    {
      code: 'this.prisma.unscoped.firma.findUnique({ where: { id } });',
    },
    // create is not in the guarded read/bulk-mutation set.
    {
      code: "this.prisma.unscoped.firma.create({ data: { name: 'x' } });",
    },
    // Computed member access does not match the heuristic shape.
    {
      code: "this.prisma.unscoped['firma'].findMany({ where: { name: 'x' } });",
    },
    // tenantId nested inside `where` object literal.
    {
      code: 'tx.unscoped.firma.updateMany({ where: { tenantId, status }, data: { status } });',
    },
    // Custom tenantFields option: the configured key satisfies the rule.
    {
      code: 'this.prisma.unscoped.firma.findMany({ where: { firmaId } });',
      options: [{ tenantFields: ['firmaId'] }],
    },
    // Multi-axis scope: where carrying BOTH configured fields is compliant.
    {
      code: 'this.prisma.unscoped.firma.findMany({ where: { tenantId, firmaId } });',
      options: [{ tenantFields: ['tenantId', 'firmaId'] }],
    },
    // findUniqueOrThrow is exempt (unique selector, like findUnique).
    {
      code: 'this.prisma.unscoped.firma.findUniqueOrThrow({ where: { id } });',
    },
    // Resolved binding that carries tenantId: compliant (not flagged).
    {
      code: 'const { unscoped } = this.prismaService; unscoped.firma.findMany({ where: { tenantId } });',
    },
  ],
  invalid: [
    // Unscoped read on tenant model, where lacks tenantId.
    {
      code: "this.prisma.unscoped.firma.findMany({ where: { name: 'x' } });",
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Unscoped findFirst with no where at all.
    {
      code: 'this.prisma.unscoped.firma.findFirst({});',
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Unscoped deleteMany with no arguments.
    {
      code: 'this.prisma.unscoped.firma.deleteMany();',
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Unscoped updateMany whose where carries the wrong key.
    {
      code: 'this.prisma.unscoped.firma.updateMany({ where: { id }, data: { status } });',
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Unscoped count without tenantId.
    {
      code: "this.prisma.unscoped.firma.count({ where: { status: 'active' } });",
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Tenant field absent under the default tenantField.
    {
      code: "tx.unscoped.firma.aggregate({ where: { kind: 'a' } });",
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Custom tenantFields option: with ['firmaId'], a where carrying only the
    // default 'tenantId' does not satisfy the requirement.
    {
      code: 'this.prisma.unscoped.firma.findMany({ where: { tenantId } });',
      options: [{ tenantFields: ['firmaId'] }],
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Multi-axis scope: a where carrying only tenantId is incomplete when both
    // tenantId AND firmaId are required (the copy-the-block leak the parameterised
    // extension is designed to prevent).
    {
      code: 'this.prisma.unscoped.firma.findMany({ where: { tenantId } });',
      options: [{ tenantFields: ['tenantId', 'firmaId'] }],
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Evasion via destructured binding: `const { unscoped } = svc` then a
    // tenant-model read missing tenantId is now resolved and flagged.
    {
      code: "const { unscoped } = this.prismaService; unscoped.firma.findMany({ where: { name: 'x' } });",
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // Evasion via single-hop alias: `const db = this.prisma.unscoped` then a
    // tenant-model read missing tenantId.
    {
      code: "const db = this.prisma.unscoped; db.firma.count({ where: { status: 'a' } });",
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // L2: findFirstOrThrow is now guarded (it reads across tenants on the
    // unscoped client just like findFirst).
    {
      code: 'this.prisma.unscoped.firma.findFirstOrThrow({ where: { id } });',
      errors: [{ messageId: 'missingTenantWhere' }],
    },
    // L2: groupBy is now guarded (an unscoped aggregate spans every tenant).
    {
      code: "this.prisma.unscoped.firma.groupBy({ by: ['status'] });",
      errors: [{ messageId: 'missingTenantWhere' }],
    },
  ],
});
