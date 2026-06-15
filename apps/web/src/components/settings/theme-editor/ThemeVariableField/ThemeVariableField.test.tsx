import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ThemeVariableField } from './index';

describe('ThemeVariableField', () => {
  it('renders a labeled field for a known color variable', () => {
    render(
      <ThemeVariableField
        varName="primary"
        group={{ labelKey: 'main', variables: ['primary'] }}
        value="oklch(0.6 0.2 280)"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });
});
