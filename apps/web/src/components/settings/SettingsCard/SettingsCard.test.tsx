import { describe, expect, it, vi } from 'vitest';
import { Info, Settings } from 'lucide-react';
import { render, screen } from '@/test/test-utils';
import { SettingsCard, SettingsInfoCallout, SettingsSelectRow, SettingsToggleRow } from './';

describe('SettingsCard', () => {
  it('renders the card title, subtitle, and icon in its header', () => {
    render(
      <SettingsCard icon={Settings} title="Ustawienia ogólne" subtitle="Dostosuj aplikację" />
    );
    expect(screen.getByRole('heading', { name: 'Ustawienia ogólne' })).toBeInTheDocument();
    expect(screen.getByText('Dostosuj aplikację')).toBeInTheDocument();
  });

  it('renders a custom icon slot in place of the default tile', () => {
    render(<SettingsCard iconSlot={<span data-testid="logo">L</span>} title="O aplikacji" />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('renders a header accessory and body children', () => {
    render(
      <SettingsCard icon={Settings} title="Karta" headerAccessory={<span>Akcesorium</span>}>
        <p>Treść karty</p>
      </SettingsCard>
    );
    expect(screen.getByText('Akcesorium')).toBeInTheDocument();
    expect(screen.getByText('Treść karty')).toBeInTheDocument();
  });
});

describe('SettingsToggleRow', () => {
  it('reflects the checked value and labels the switch by the row title', () => {
    render(<SettingsToggleRow title="Tryb ciemny" checked onCheckedChange={() => {}} />);
    const sw = screen.getByRole('switch', { name: 'Tryb ciemny' });
    expect(sw).toBeChecked();
  });

  it('fires onCheckedChange with the toggled value', async () => {
    const onCheckedChange = vi.fn();
    const { user } = render(
      <SettingsToggleRow title="Tryb ciemny" checked={false} onCheckedChange={onCheckedChange} />
    );
    await user.click(screen.getByRole('switch', { name: 'Tryb ciemny' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('does not fire when disabled', async () => {
    const onCheckedChange = vi.fn();
    const { user } = render(
      <SettingsToggleRow
        title="Tryb ciemny"
        checked={false}
        onCheckedChange={onCheckedChange}
        disabled
      />
    );
    const sw = screen.getByRole('switch', { name: 'Tryb ciemny' });
    expect(sw).toBeDisabled();
    await user.click(sw);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe('SettingsSelectRow', () => {
  const options = [
    { value: 'pl', label: 'Polski' },
    { value: 'en', label: 'English' },
  ];

  it('labels the trigger by the row title and shows the current value', () => {
    render(
      <SettingsSelectRow title="Język" value="pl" onValueChange={() => {}} options={options} />
    );
    // The Radix trigger renders the selected option's label; opening the
    // portalled listbox + picking an option is covered by the Storybook play
    // test (jsdom lacks the pointer-capture APIs Radix Select needs).
    expect(screen.getByRole('combobox', { name: 'Język' })).toHaveTextContent('Polski');
  });

  it('disables the trigger when disabled', () => {
    render(
      <SettingsSelectRow
        title="Język"
        value="pl"
        onValueChange={() => {}}
        options={options}
        disabled
      />
    );
    expect(screen.getByRole('combobox', { name: 'Język' })).toBeDisabled();
  });
});

describe('SettingsInfoCallout', () => {
  it('renders its icon and body children', () => {
    render(
      <SettingsInfoCallout icon={Info} iconClassName="w-4 h-4">
        Wymagany restart aplikacji.
      </SettingsInfoCallout>
    );
    expect(screen.getByText('Wymagany restart aplikacji.')).toBeInTheDocument();
  });
});
