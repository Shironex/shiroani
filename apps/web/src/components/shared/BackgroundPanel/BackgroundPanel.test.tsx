import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';

const pickBackground = vi.fn();
const removeBackground = vi.fn();
const setBackgroundOpacity = vi.fn();
const setBackgroundBlur = vi.fn();
const setBackgroundDim = vi.fn();

function seedStore(overrides?: Partial<ReturnType<typeof useBackgroundStore.getState>>) {
  useBackgroundStore.setState({
    customBackground: null,
    customBackgroundFileName: null,
    backgroundOpacity: 0.6,
    backgroundBlur: 0,
    backgroundDim: 0.6,
    pickBackground,
    removeBackground,
    setBackgroundOpacity,
    setBackgroundBlur,
    setBackgroundDim,
    ...overrides,
  });
}

describe('BackgroundPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore();
  });

  it('renders the pick-image button in the card variant', () => {
    render(<BackgroundPanel variant="card" />);
    expect(screen.getByRole('button', { name: /pick image/i })).toBeInTheDocument();
  });

  it('calls pickBackground when the pick-image button is clicked', async () => {
    const { user } = render(<BackgroundPanel variant="card" />);
    await user.click(screen.getByRole('button', { name: /pick image/i }));
    expect(pickBackground).toHaveBeenCalledTimes(1);
  });

  it('hides the remove button and sliders when no custom background is set (card)', () => {
    render(<BackgroundPanel variant="card" />);
    expect(screen.queryByRole('button', { name: /remove background/i })).not.toBeInTheDocument();
    // No sliders without an image in the card variant.
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    // Empty preview shows the "Default" label.
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('shows the remove button + sliders once a custom background exists (card)', async () => {
    seedStore({ customBackground: 'shiroani-bg://backgrounds/a.png' });
    const { user } = render(<BackgroundPanel variant="card" />);

    const previewImg = screen.getByRole('img', { name: /background preview/i });
    expect(previewImg).toHaveAttribute('src', 'shiroani-bg://backgrounds/a.png');
    expect(screen.getByText('Custom background')).toBeInTheDocument();

    // Opacity, blur and dim sliders are present.
    expect(screen.getAllByRole('slider')).toHaveLength(3);

    const remove = screen.getByRole('button', { name: /remove background/i });
    await user.click(remove);
    expect(removeBackground).toHaveBeenCalledTimes(1);
  });

  it('adjusts opacity via the keyboard on the first slider (card)', async () => {
    seedStore({ customBackground: 'shiroani-bg://backgrounds/a.png', backgroundOpacity: 0.6 });
    const { user } = render(<BackgroundPanel variant="card" />);

    // Card sliders render in order: opacity, blur, dim. The slider role sits on
    // the Radix thumb; the accessible name lives on the Root, so target by index.
    const [opacity] = screen.getAllByRole('slider');
    opacity.focus();
    await user.keyboard('{ArrowRight}');
    expect(setBackgroundOpacity).toHaveBeenCalled();
  });

  it('renders the onboarding variant with always-present sliders disabled until an image is set', () => {
    render(<BackgroundPanel variant="onboarding" />);
    expect(screen.getByText('No background')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pick image/i })).toBeInTheDocument();
    // Onboarding always shows the three sliders; Radix marks disabled thumbs with
    // the `data-disabled` attribute.
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(3);
    for (const s of sliders) {
      expect(s).toHaveAttribute('data-disabled');
    }
  });

  it('enables onboarding sliders and shows a reset button once a background is set', () => {
    seedStore({ customBackground: 'shiroani-bg://backgrounds/a.png' });
    render(<BackgroundPanel variant="onboarding" />);

    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    for (const s of screen.getAllByRole('slider')) {
      expect(s).not.toHaveAttribute('data-disabled');
    }
  });

  it('honours custom remove icon/label overrides', () => {
    seedStore({ customBackground: 'shiroani-bg://backgrounds/a.png' });
    render(<BackgroundPanel variant="card" removeLabel="Wipe it" />);
    expect(screen.getByRole('button', { name: 'Wipe it' })).toBeInTheDocument();
  });
});
