import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { useNewTabStore, type NewTabPanelId } from '@/stores/useNewTabStore';
import { NewTabPreview } from '.';

const DEFAULT_ORDER: NewTabPanelId[] = ['greeting', 'airing', 'quickAccess', 'recents', 'resume'];

function seedStore(overrides: Partial<ReturnType<typeof useNewTabStore.getState>> = {}) {
  useNewTabStore.setState({
    order: DEFAULT_ORDER,
    hiddenPanels: [],
    showWatermark: true,
    showGreetingName: true,
    airingCount: 12,
    ...overrides,
  });
}

describe('NewTabPreview', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    seedStore();
  });

  afterEach(() => {
    seedStore();
  });

  it('renders the preview stage', () => {
    render(<NewTabPreview label="Preview" />);
    expect(screen.getByTestId('newtab-preview')).toBeInTheDocument();
  });

  it('shows the all-hidden message when every panel is hidden', () => {
    seedStore({ hiddenPanels: DEFAULT_ORDER });
    render(<NewTabPreview label="Preview" />);
    expect(screen.getByText('All panels hidden.')).toBeInTheDocument();
  });

  it('hides the kanji watermark when the toggle is off', () => {
    const { rerender } = render(<NewTabPreview label="Preview" />);
    expect(screen.getByText('網')).toBeInTheDocument();
    seedStore({ showWatermark: false });
    rerender(<NewTabPreview label="Preview" />);
    expect(screen.queryByText('網')).not.toBeInTheDocument();
  });

  it('renders one airing poster per card count up to its clamp', () => {
    const stage = () => screen.getByTestId('newtab-preview');
    const posterCount = () => stage().querySelectorAll('span.h-\\[24px\\].w-\\[18px\\]').length;

    seedStore({ order: ['airing'], airingCount: 6 });
    const { rerender } = render(<NewTabPreview label="Preview" />);
    expect(posterCount()).toBe(6);

    seedStore({ order: ['airing'], airingCount: 14 });
    rerender(<NewTabPreview label="Preview" />);
    expect(posterCount()).toBe(14);
  });

  it('renders the optional label caption', () => {
    render(<NewTabPreview label="Preview" />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
