import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useDockStore } from '@/stores/useDockStore';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import SummaryStep from './SummaryStep';

beforeEach(() => {
  useSettingsStore.setState({ theme: 'plum' });
  useDockStore.setState({ edge: 'bottom', autoHide: false });
  useBrowserStore.setState({ adblockEnabled: true });
  useBackgroundStore.setState({ customBackground: null, backgroundBlur: 4 });
});

/** Returns the summary row container for the given label, scoped for value lookup. */
function rowValue(label: string): HTMLElement {
  // The label text sits in the row's first span; closest('div') is the row.
  return screen.getByText(label).closest('div') as HTMLElement;
}

describe('SummaryStep', () => {
  it('renders the summary title and the reflected setting rows', () => {
    render(<SummaryStep />);

    expect(screen.getByRole('heading', { name: 'All ready!' })).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Adblock')).toBeInTheDocument();
  });

  it('reflects the chosen theme, dock edge and adblock state', () => {
    useSettingsStore.setState({ theme: 'matcha' });
    useDockStore.setState({ edge: 'left', autoHide: false });
    useBrowserStore.setState({ adblockEnabled: true });
    render(<SummaryStep />);

    expect(within(rowValue('Theme')).getByText('Matcha')).toBeInTheDocument();
    expect(within(rowValue('Dock')).getByText('Left')).toBeInTheDocument();
    expect(within(rowValue('Adblock')).getByText('ON')).toBeInTheDocument();
  });

  it('shows OFF for adblock and "No background" when nothing is set', () => {
    useBrowserStore.setState({ adblockEnabled: false });
    useBackgroundStore.setState({ customBackground: null });
    render(<SummaryStep />);

    expect(within(rowValue('Adblock')).getByText('OFF')).toBeInTheDocument();
    expect(within(rowValue('Background')).getByText('No background')).toBeInTheDocument();
  });

  it('reflects the default English language', () => {
    render(<SummaryStep />);
    expect(within(rowValue('Language')).getByText('English')).toBeInTheDocument();
  });
});
