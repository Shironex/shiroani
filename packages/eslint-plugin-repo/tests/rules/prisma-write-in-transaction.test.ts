import { prismaWriteInTransactionRule } from '../../src/rules/prisma-write-in-transaction';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('prisma-write-in-transaction', prismaWriteInTransactionRule, {
  valid: [
    // A single write alone is safe; nothing to coordinate.
    {
      code: `
        class InvoiceService {
          async createInvoice() {
            await this.prisma.client.invoice.create({ data: {} });
          }
        }
      `,
    },
    // Two writes both inside one interactive `$transaction(async (tx) => {...})`.
    {
      code: `
        class InvoiceService {
          async createInvoice() {
            await this.prisma.client.$transaction(async (tx) => {
              await tx.invoice.create({ data: {} });
              await tx.invoiceLine.createMany({ data: [] });
            });
          }
        }
      `,
    },
    // Array form: the writes are arguments to `$transaction` and must not be flagged.
    {
      code: `
        async function run() {
          await prisma.$transaction([
            prisma.invoice.create({ data: {} }),
            prisma.invoiceLine.createMany({ data: [] }),
          ]);
        }
      `,
    },
    // Writes split across two separate methods: one each, neither reaches the threshold.
    {
      code: `
        class InvoiceService {
          async a() {
            await this.prisma.client.invoice.create({ data: {} });
          }
          async b() {
            await this.prisma.client.invoiceLine.createMany({ data: [] });
          }
        }
      `,
    },
    // The BaseRepository `this.client` idiom: a single write per method is safe,
    // matching the one-write-per-repository-method convention.
    {
      code: `
        class TokenRepository {
          async create() {
            await this.client.token.create({ data: {} });
          }
        }
      `,
    },
    // Two `this.client` writes wrapped in a $transaction are coordinated: not flagged.
    {
      code: `
        class TokenRepository {
          async rotate() {
            await this.client.$transaction(async (tx) => {
              await tx.token.delete({ where: {} });
              await tx.token.create({ data: {} });
            });
          }
        }
      `,
    },
  ],
  invalid: [
    // Two awaited writes directly in a method with no `$transaction`.
    {
      code: `
        class InvoiceService {
          async createInvoice() {
            await this.prisma.client.invoice.create({ data: {} });
            await this.prisma.client.invoiceLine.createMany({ data: [] });
          }
        }
      `,
      errors: [{ messageId: 'multiWriteNotTransactional' }],
    },
    // M3: two BaseRepository `this.client` writes in one method (no $transaction)
    // are now recognised and flagged as a split-brain risk.
    {
      code: `
        class TokenRepository {
          async replace() {
            await this.client.token.delete({ where: {} });
            await this.client.token.create({ data: {} });
          }
        }
      `,
      errors: [{ messageId: 'multiWriteNotTransactional' }],
    },
  ],
});
