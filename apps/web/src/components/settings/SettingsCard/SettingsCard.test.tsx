import { describe, expect, it } from 'vitest';
import { Settings } from 'lucide-react';
import { render, screen } from '@/test/test-utils';
import { SettingsCard, SettingsToggleRow, SettingsSelectRow } from './';

describe('SettingsCard', () => {
  it('renders the card title in its header', () => {
    render(<SettingsCard icon={Settings} title="Ustawienia ogólne" />);
    expect(screen.getByText('Ustawienia ogólne')).toBeInTheDocument();
  });

  it('renders a toggle row wired to a switch', () => {
    render(<SettingsToggleRow title="Tryb ciemny" checked onCheckedChange={() => {}} />);
    expect(screen.getByText('Tryb ciemny')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('renders a select row showing the current value', () => {
    render(
      <SettingsSelectRow
        title="Język"
        value="pl"
        onValueChange={() => {}}
        options={[
          { value: 'pl', label: 'Polski' },
          { value: 'en', label: 'English' },
        ]}
      />
    );
    expect(screen.getByText('Język')).toBeInTheDocument();
    // The Radix trigger renders the selected option's label; the dropdown is
    // not opened here (jsdom lacks the pointer-capture APIs Radix Select needs).
    expect(screen.getByRole('combobox')).toHaveTextContent('Polski');
  });
});
