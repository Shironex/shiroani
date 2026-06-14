import { mutatingServiceMustAuditRule } from '../../src/rules/mutating-service-must-audit';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('mutating-service-must-audit', mutatingServiceMustAuditRule, {
  valid: [
    // Audit AFTER the transaction commits is the correct placement.
    {
      code: `
        async function handler() {
          await this.prisma.client.$transaction(async (tx) => {
            await tx.firma.update({ where: { id }, data });
          });
          await this.auditService.log({ action: 'update' });
        }
      `,
    },
    // No transaction anywhere -> nothing to police.
    {
      code: `
        async function handler() {
          await this.auditService.log({ action: 'update' });
        }
      `,
    },
    // Receiver gate: a non-audit `.log()` inside the tx must NOT fire.
    {
      code: `
        async function handler() {
          await this.prisma.client.$transaction(async (tx) => {
            this.logger.log({ msg: 'inside tx' });
          });
        }
      `,
    },
    // A `.log()` on an audit receiver but outside any tx callback is fine.
    {
      code: `
        async function handler() {
          auditService.log({ action: 'noop' });
        }
      `,
    },
  ],
  invalid: [
    // Canonical: audit log directly inside a `$transaction` callback.
    {
      code: `
        async function handler() {
          await this.prisma.client.$transaction(async (tx) => {
            await tx.firma.update({ where: { id }, data });
            this.auditService.log({ action: 'update' });
          });
        }
      `,
      errors: [{ messageId: 'auditInsideTransaction' }],
    },
    // Bare-identifier audit receiver inside a `tx.$transaction(...)` callback.
    {
      code: `
        async function handler() {
          await tx.$transaction(async (inner) => {
            auditService.log({ action: 'delete' });
          });
        }
      `,
      errors: [{ messageId: 'auditInsideTransaction' }],
    },
    // Walk-up must not stop at the first function boundary: the audit log is
    // nested one callback deeper (inside a `.forEach`) within the tx callback.
    {
      code: `
        async function handler() {
          await this.prisma.client.$transaction(async (tx) => {
            rows.forEach(() => {
              this.auditService.log({ action: 'each' });
            });
          });
        }
      `,
      errors: [{ messageId: 'auditInsideTransaction' }],
    },
  ],
});
