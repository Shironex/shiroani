import { tenantWriteMustCarryTenantIdRule } from '../../src/rules/tenant-write-must-carry-tenant-id';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('tenant-write-must-carry-tenant-id', tenantWriteMustCarryTenantIdRule, {
  valid: [
    // Unscoped create with tenantId shorthand in data: compliant.
    {
      code: 'this.prisma.unscoped.firma.create({ data: { name, tenantId } });',
    },
    // Unscoped create with explicit tenantId value from a trusted source.
    {
      code: 'this.prisma.unscoped.firma.create({ data: { name, tenantId: ctx.tenantId } });',
    },
    // Extended (request-path) client auto-injects tenantId on create: exempt.
    {
      code: 'this.prisma.client.firma.create({ data: { name } });',
    },
    // Extended client createMany: exempt (no `unscoped` in chain).
    {
      code: "tx.firma.createMany({ data: [{ name: 'a' }] });",
    },
    // Non-tenant model on the unscoped client: not policed.
    {
      code: "this.prisma.unscoped.user.create({ data: { email: 'x' } });",
    },
    // Spread inside data: cannot statically verify, allowed.
    {
      code: 'this.prisma.unscoped.firma.create({ data: { ...dto } });',
    },
    // data is an identifier (not an object literal): unverifiable, allowed.
    {
      code: 'this.prisma.unscoped.firma.create({ data: payload });',
    },
    // createMany with array elements all carrying tenantId: compliant.
    {
      code: "this.prisma.unscoped.firma.createMany({ data: [{ name: 'a', tenantId }, { name: 'b', tenantId }] });",
    },
    // createMany element with a spread: unverifiable element, allowed.
    {
      code: 'this.prisma.unscoped.firma.createMany({ data: [{ ...row }] });',
    },
    // createMany via .map concise arrow returning object with tenantId.
    {
      code: 'this.prisma.unscoped.firma.createMany({ data: rows.map((r) => ({ name: r.name, tenantId })) });',
    },
    // createMany via .map block body returning object with tenantId.
    {
      code: 'this.prisma.unscoped.firma.createMany({ data: rows.map((r) => { return { name: r.name, tenantId }; }) });',
    },
    // createMany .map where returned object cannot be cleanly extracted: allowed.
    {
      code: 'this.prisma.unscoped.firma.createMany({ data: rows.map(buildRow) });',
    },
    // Computed member access on the model does not match the heuristic shape.
    {
      code: "this.prisma.unscoped['firma'].create({ data: { name: 'x' } });",
    },
    // create with no arguments at all: unverifiable, allowed.
    {
      code: 'this.prisma.unscoped.firma.create();',
    },
    // Configured custom field present in data: respects the option.
    {
      code: 'this.prisma.unscoped.firma.create({ data: { name, firmaId } });',
      options: [{ tenantModels: ['firma'], tenantFields: ['firmaId'] }],
    },
    // Multi-axis scope: data carrying BOTH configured fields is compliant.
    {
      code: 'this.prisma.unscoped.firma.create({ data: { name, tenantId, firmaId } });',
      options: [{ tenantModels: ['firma'], tenantFields: ['tenantId', 'firmaId'] }],
    },
    // Resolved binding whose data carries tenantId: compliant (not flagged).
    {
      code: 'const { unscoped } = this.prismaService; unscoped.firma.create({ data: { name, tenantId } });',
    },
  ],
  invalid: [
    // Spec INVALID: unscoped create on tenant model, data lacks tenantId.
    {
      code: "this.prisma.unscoped.firma.create({ data: { name: 'x' } });",
      errors: [{ messageId: 'missingTenantId' }],
    },
    // Unscoped create with data lacking tenantId (shorthand other key).
    {
      code: 'this.prisma.unscoped.firma.create({ data: { name } });',
      errors: [{ messageId: 'missingTenantId' }],
    },
    // createMany array where one element lacks tenantId.
    {
      code: "this.prisma.unscoped.firma.createMany({ data: [{ name: 'a', tenantId }, { name: 'b' }] });",
      errors: [{ messageId: 'missingTenantId' }],
    },
    // createMany via .map concise arrow returning object without tenantId.
    {
      code: 'this.prisma.unscoped.firma.createMany({ data: rows.map((r) => ({ name: r.name })) });',
      errors: [{ messageId: 'missingTenantId' }],
    },
    // createMany via .map block body returning object without tenantId.
    {
      code: 'this.prisma.unscoped.firma.createMany({ data: rows.map((r) => { return { name: r.name }; }) });',
      errors: [{ messageId: 'missingTenantId' }],
    },
    // Configured custom field absent from data.
    {
      code: 'this.prisma.unscoped.firma.create({ data: { name } });',
      options: [{ tenantModels: ['firma'], tenantFields: ['firmaId'] }],
      errors: [{ messageId: 'missingTenantId' }],
    },
    // Multi-axis scope: data carrying only tenantId is incomplete when both
    // tenantId AND firmaId are required.
    {
      code: 'this.prisma.unscoped.firma.create({ data: { name, tenantId } });',
      options: [{ tenantModels: ['firma'], tenantFields: ['tenantId', 'firmaId'] }],
      errors: [{ messageId: 'missingTenantId' }],
    },
    // Evasion via destructured binding: a create through `const { unscoped }`
    // missing tenantId is now resolved and flagged.
    {
      code: "const { unscoped } = this.prismaService; unscoped.firma.create({ data: { name: 'x' } });",
      errors: [{ messageId: 'missingTenantId' }],
    },
  ],
});
