import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ThemeVariableField } from './index';

const colorGroup = { labelKey: 'main' as const, variables: ['primary'] };
const shadowGroup = {
  labelKey: 'shadows' as const,
  variables: ['shadow-sm'],
  isTextOnly: true,
};

describe('ThemeVariableField', () => {
  it('renders a labeled color picker for a known color variable', () => {
    render(
      <ThemeVariableField
        varName="primary"
        group={colorGroup}
        value="oklch(0.6 0.2 280)"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Hex code: Primary/ })).toBeInTheDocument();
  });

  it('renders a mono text input for a shadow (text-only) variable', () => {
    render(
      <ThemeVariableField
        varName="shadow-sm"
        group={shadowGroup}
        value="0 1px 2px rgb(0 0 0 / 0.1)"
        onChange={() => {}}
      />
    );
    const input = screen.getByLabelText('Shadow Sm');
    expect(input).toHaveValue('0 1px 2px rgb(0 0 0 / 0.1)');
  });

  it('fires onChange with the typed value for a text variable', async () => {
    const onChange = vi.fn();
    const { user } = render(
      <ThemeVariableField varName="shadow-sm" group={shadowGroup} value="" onChange={onChange} />
    );
    await user.type(screen.getByLabelText('Shadow Sm'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('renders nothing for an unknown variable', () => {
    const { container } = render(
      <ThemeVariableField
        varName="not-a-real-var"
        group={colorGroup}
        value=""
        onChange={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
