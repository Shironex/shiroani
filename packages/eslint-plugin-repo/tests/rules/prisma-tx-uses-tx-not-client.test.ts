import { prismaTxUsesTxNotClientRule } from '../../src/rules/prisma-tx-uses-tx-not-client';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('prisma-tx-uses-tx-not-client', prismaTxUsesTxNotClientRule, {
  valid: [
    // Write goes through the tx param.
    {
      code: `this.prisma.client.$transaction(async (tx) => { await tx.invoice.create({ data }); });`,
    },
    // Deeper model access on the tx param is still rooted at `tx`.
    {
      code: `this.prisma.client.$transaction(async (tx) => { await tx.firma.createMany({ data }); });`,
    },
    // Query methods (findMany/count) on the outer client are not writes -> ignored.
    {
      code: `this.prisma.client.$transaction(async (tx) => { const rows = await this.prisma.client.firma.findMany(); await tx.firma.update({ where, data }); });`,
    },
    // Writes outside any transaction are not this rule's concern.
    {
      code: `await this.prisma.client.firma.create({ data });`,
    },
    // Array form (no interactive callback) is not policed.
    {
      code: `this.prisma.client.$transaction([this.prisma.client.firma.create({ data })]);`,
    },
    // Nested transactions each use their own tx param.
    {
      code: `tx.$transaction(async (tx2) => { await tx2.invoice.create({ data }); });`,
    },
    // A custom param name is honored.
    {
      code: `prisma.$transaction(async (trx) => { await trx.firma.delete({ where }); });`,
    },
    // The BaseRepository `this.client` idiom OUTSIDE any transaction is not this
    // rule's concern.
    {
      code: `await this.client.firma.create({ data });`,
    },
  ],
  invalid: [
    // Outer client write inside the callback escapes rollback.
    {
      code: `this.prisma.client.$transaction(async (tx) => { await this.prisma.client.invoiceLine.createMany({ data }); });`,
      errors: [{ messageId: 'mustUseTxParam' }],
    },
    // Bare outer-client identifier write inside the callback.
    {
      code: `prisma.$transaction(async (tx) => { await prisma.firma.update({ where, data }); });`,
      errors: [{ messageId: 'mustUseTxParam' }],
    },
    // Two outer-client writes -> two reports.
    {
      code: `this.prisma.client.$transaction(async (tx) => { await this.prisma.client.firma.create({ data }); await this.prisma.client.invoice.delete({ where }); });`,
      errors: [{ messageId: 'mustUseTxParam' }, { messageId: 'mustUseTxParam' }],
    },
    // Nested: writing through the OUTER tx param instead of the inner one still escapes the inner tx.
    {
      code: `tx.$transaction(async (tx2) => { await tx.invoice.create({ data }); });`,
      errors: [{ messageId: 'mustUseTxParam' }],
    },
    // M3 gap: the BaseRepository `this.client` idiom used inside the callback
    // escapes the transaction the same as `this.prisma.client`. `client` is now
    // a recognised Prisma-client receiver property.
    {
      code: `this.prisma.client.$transaction(async (tx) => { await this.client.firma.create({ data }); });`,
      errors: [{ messageId: 'mustUseTxParam' }],
    },
  ],
});
