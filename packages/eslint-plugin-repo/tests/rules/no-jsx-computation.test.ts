import { noJsxComputationRule } from '../../src/rules/no-jsx-computation';
import { ruleTester } from '../test-utils/ruleTester';

const FILE = 'apps/web/src/features/dashboard/components/Widget/Widget.tsx';

function jsx(body: string): string {
  return `export default function Widget(props: any) { return <div>${body}</div>; }`;
}

ruleTester.run('no-jsx-computation', noJsxComputationRule, {
  valid: [
    // Single guard and ternary are declarative and allowed.
    { code: jsx(`{props.open && <span />}`), filename: FILE },
    { code: jsx(`{props.open ? <a /> : <b />}`), filename: FILE },
    // Pre-computed list rendered from a const.
    {
      code: `export default function Widget(props: any) { const rows = props.items.map((i: any) => <li key={i} />); return <ul>{rows}</ul>; }`,
      filename: FILE,
    },
    // Computation inside an event handler is not render-time work.
    {
      code: `export default function Widget(props: any) { return <button onClick={() => props.items.map((i: any) => i)} />; }`,
      filename: FILE,
    },
  ],
  invalid: [
    {
      code: jsx(`{props.items.map((i: any) => <li key={i} />)}`),
      filename: FILE,
      errors: [{ messageId: 'arrayMethod' }],
    },
    { code: jsx(`{props.count * 2}`), filename: FILE, errors: [{ messageId: 'arithmetic' }] },
    {
      code: jsx(`{props.a && props.b && <span />}`),
      filename: FILE,
      errors: [{ messageId: 'chainedLogical' }],
    },
  ],
});
