import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import i18n from '@/lib/i18n';
import BackgroundSettings from './BackgroundSettings';

const DEMO_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"></svg>';

function seedBackground(overrides?: Partial<ReturnType<typeof useBackgroundStore.getState>>) {
  useBackgroundStore.setState({
    customBackground: null,
    customBackgroundFileName: null,
    backgroundOpacity: 0.6,
    backgroundBlur: 4,
    backgroundDim: 0.5,
    pickBackground: vi.fn().mockResolvedValue(undefined),
    removeBackground: vi.fn().mockResolvedValue(undefined),
    setBackgroundOpacity: vi.fn(),
    setBackgroundBlur: vi.fn(),
    setBackgroundDim: vi.fn(),
    ...overrides,
  });
}

describe('BackgroundSettings', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    seedBackground();
  });

  afterEach(() => {
    seedBackground();
  });

  it('renders the background card title', () => {
    render(<BackgroundSettings />);
    expect(screen.getByText('App background')).toBeInTheDocument();
  });

  it('renders the embedded BackgroundPanel pick action', () => {
    render(<BackgroundSettings />);
    expect(screen.getByRole('button', { name: /pick image/i })).toBeInTheDocument();
  });

  it('clicking the pick action delegates to the store pickBackground', async () => {
    const pickBackground = vi.fn().mockResolvedValue(undefined);
    seedBackground({ pickBackground });
    const { user } = render(<BackgroundSettings />);
    await user.click(screen.getByRole('button', { name: /pick image/i }));
    expect(pickBackground).toHaveBeenCalledOnce();
  });

  it('with no custom background, the remove action and sliders are hidden', () => {
    render(<BackgroundSettings />);
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('with a custom background, reveals the remove action and the opacity slider', async () => {
    seedBackground({ customBackground: DEMO_IMAGE, customBackgroundFileName: 'demo.svg' });
    render(<BackgroundSettings />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    );
    // The card variant exposes opacity, blur, and dim sliders once an image is set.
    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(3);
  });

  it('clicking remove delegates to the store removeBackground', async () => {
    const removeBackground = vi.fn().mockResolvedValue(undefined);
    seedBackground({
      customBackground: DEMO_IMAGE,
      customBackgroundFileName: 'demo.svg',
      removeBackground,
    });
    const { user } = render(<BackgroundSettings />);
    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(removeBackground).toHaveBeenCalledOnce();
  });
});
