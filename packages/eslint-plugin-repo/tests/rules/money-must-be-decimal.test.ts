import { moneyMustBeDecimalRule } from '../../src/rules/money-must-be-decimal';
import { ruleTester } from '../test-utils/ruleTester';

ruleTester.run('money-must-be-decimal', moneyMustBeDecimalRule, {
  valid: [
    // Money name but typed as the domain money type: the desired shape.
    { code: 'const total: Decimal = sum;' },
    { code: 'class Invoice { total: Decimal; }' },
    // Non-money names typed as number are fine.
    { code: 'const count: number = 3;' },
    { code: 'const userName: string = "x";' },
    { code: 'class Widget { quantity: number; }' },
    // Money name but UNTYPED: must NOT flag (no annotation to inspect).
    { code: 'let total = 0;' },
    { code: 'class Cart { total = 0; }' },
    // Money name with a numeric-literal initializer but no annotation. The
    // initializer branch is intentionally NOT implemented (would catch
    // accumulators), so this stays valid.
    { code: 'const x = { total: 5 };' },
    { code: 'const balance = 100;' },
    // Interface / type-literal members are intentionally out of scope so the
    // current codebase (download progress, demo fixtures) stays green.
    { code: 'interface Payment { amount: number; }' },
    { code: 'type Progress = { total: number; transferred: number };' },
    // Allowlisted file by path suffix is skipped entirely.
    {
      code: 'class Legacy { total: number; }',
      options: [{ allowedFiles: ['apps/api/src/legacy/legacy.service.ts'] }],
      filename: 'apps/api/src/legacy/legacy.service.ts',
    },
    // Custom namePattern that does not match the field name leaves it valid.
    {
      code: 'class Order { total: number; }',
      options: [{ namePattern: '(amount|price)' }],
    },
  ],
  invalid: [
    // The canonical case: a class property named like money, typed number.
    {
      code: 'class Invoice { total: number; }',
      errors: [{ messageId: 'moneyMustBeDecimal' }],
    },
    // Annotated variable declarator named like money, typed number.
    {
      code: 'const amount: number = 5;',
      errors: [{ messageId: 'moneyMustBeDecimal' }],
    },
    // Polish-accounting money names are covered by the default pattern.
    {
      code: 'class Faktura { kwota: number; }',
      errors: [{ messageId: 'moneyMustBeDecimal' }],
    },
    {
      code: 'class Pozycja { netto: number; brutto: number; }',
      errors: [{ messageId: 'moneyMustBeDecimal' }, { messageId: 'moneyMustBeDecimal' }],
    },
    // Custom namePattern can flag a name the default pattern would miss.
    {
      code: 'class Tx { discount: number; }',
      options: [{ namePattern: '(discount)' }],
      errors: [{ messageId: 'moneyMustBeDecimal' }],
    },
  ],
});
