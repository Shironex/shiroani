import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import { MascotSection } from '.';

/**
 * Radix Select calls `hasPointerCapture`/`releasePointerCapture` and scrolls the
 * active option into view; jsdom implements neither. Stub them so the listbox
 * opens and options are clickable under jsdom.
 */
beforeAll(() => {
  const proto = window.HTMLElement.prototype;
  proto.hasPointerCapture ??= () => false;
  proto.releasePointerCapture ??= () => {};
  proto.setPointerCapture ??= () => {};
  proto.scrollIntoView ??= () => {};
});

/**
 * Build a fully-stubbed overlay bridge so the section's mount effect resolves
 * and flips `loaded` to true, rendering the card and its controls. Each method
 * is a vi.fn() the tests can assert against. Defaults match the hook's initial
 * state so the controls reflect the seeded values.
 */
function installOverlay(overrides: Partial<Record<string, unknown>> = {}) {
  const overlay = {
    isEnabled: vi.fn().mockResolvedValue(true),
    getSize: vi.fn().mockResolvedValue(128),
    getVisibilityMode: vi.fn().mockResolvedValue('always'),
    isPositionLocked: vi.fn().mockResolvedValue(false),
    isAnimationEnabled: vi.fn().mockResolvedValue(true),
    setEnabled: vi.fn().mockResolvedValue({ success: true }),
    setSize: vi.fn().mockResolvedValue({ success: true }),
    setVisibilityMode: vi.fn().mockResolvedValue({ success: true }),
    setPositionLocked: vi.fn().mockResolvedValue({ success: true }),
    setAnimationEnabled: vi.fn().mockResolvedValue({ success: true }),
    resetPosition: vi.fn().mockResolvedValue({ success: true }),
    setSpriteScale: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  (window as unknown as { electronAPI?: unknown }).electronAPI = { overlay };
  return overlay;
}

/** Wait for the card to render after the loaded gate resolves. */
async function renderLoaded() {
  const utils = render(<MascotSection />);
  await screen.findByText('Desktop mascot');
  return utils;
}

describe('MascotSection', () => {
  const realPickSprite = useMascotSpriteStore.getState().pickSprite;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useMascotSpriteStore.setState({
      customSpriteUrl: null,
      customSpriteFileName: null,
      scaleMode: 'contain',
      pickSprite: realPickSprite,
    });
  });

  afterEach(() => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    vi.clearAllMocks();
  });

  it('renders without throwing when the overlay API is absent', () => {
    expect(() => render(<MascotSection />)).not.toThrow();
  });

  it('hydrates the controls from the overlay bridge once loaded', async () => {
    installOverlay({ getSize: vi.fn().mockResolvedValue(96) });
    await renderLoaded();
    expect(screen.getByText('96px')).toBeInTheDocument();
    // The enable switch reads the hydrated checked state.
    expect(screen.getByRole('switch', { name: 'Enable mascot' })).toBeChecked();
  });

  it('hides the mascot controls until enabled', async () => {
    installOverlay({ isEnabled: vi.fn().mockResolvedValue(false) });
    render(<MascotSection />);
    await screen.findByText('Desktop mascot');
    // With the mascot disabled, the size slider and sprite row stay hidden.
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByText('Mascot size')).not.toBeInTheDocument();
  });

  it('pushes the toggle state to the overlay bridge', async () => {
    const overlay = installOverlay();
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('switch', { name: 'Enable mascot' }));
    await waitFor(() => expect(overlay.setEnabled).toHaveBeenCalledWith(false));
  });

  it('nudges the size slider and debounces the overlay resize', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const overlay = installOverlay();
    const { user } = await renderLoaded();
    const slider = screen.getByRole('slider', { name: 'Mascot size' });
    slider.focus();
    await user.keyboard('{ArrowRight}');
    // Display updates immediately; the native resize is debounced 150ms.
    await waitFor(() => expect(screen.getByText('136px')).toBeInTheDocument());
    await vi.advanceTimersByTimeAsync(200);
    expect(overlay.setSize).toHaveBeenCalledWith(136);
    vi.useRealTimers();
  });

  it('changes the visibility mode through the select', async () => {
    const overlay = installOverlay();
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('combobox', { name: 'Visibility mode' }));
    await user.click(await screen.findByRole('option', { name: 'Only when window is minimised' }));
    await waitFor(() => expect(overlay.setVisibilityMode).toHaveBeenCalledWith('tray-only'));
  });

  it('toggles the lock and animation switches into the bridge', async () => {
    const overlay = installOverlay();
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('switch', { name: /Lock position/i }));
    await waitFor(() => expect(overlay.setPositionLocked).toHaveBeenCalledWith(true));
    await user.click(screen.getByRole('switch', { name: /Mascot animation/i }));
    await waitFor(() => expect(overlay.setAnimationEnabled).toHaveBeenCalledWith(false));
  });

  it('resets the position via the bridge', async () => {
    const overlay = installOverlay();
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(overlay.resetPosition).toHaveBeenCalled());
  });

  it('hides the sprite scale-mode select until a custom sprite is set', async () => {
    installOverlay();
    await renderLoaded();
    expect(screen.queryByText('Sprite scaling')).not.toBeInTheDocument();
    // The pick button reads "Pick sprite" while no custom sprite exists.
    expect(screen.getByRole('button', { name: /Pick sprite/i })).toBeInTheDocument();
  });

  it('reveals the scale-mode select and a reset action with a custom sprite', async () => {
    const overlay = installOverlay();
    useMascotSpriteStore.setState({
      customSpriteUrl: 'shiroani-mascot://sprites/demo.png',
      customSpriteFileName: 'demo.png',
      scaleMode: 'contain',
    });
    const { user } = await renderLoaded();
    expect(screen.getByText('Sprite scaling')).toBeInTheDocument();
    // With a sprite present the pick button switches to "Change".
    expect(screen.getByRole('button', { name: /Change/i })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Sprite scaling' }));
    await user.click(await screen.findByRole('option', { name: 'Fill (crop edges)' }));
    await waitFor(() => expect(overlay.setSpriteScale).toHaveBeenCalledWith('cover'));
  });

  it('surfaces a pick error returned by the sprite store', async () => {
    installOverlay();
    useMascotSpriteStore.setState({
      pickSprite: vi.fn().mockRejectedValue(new Error('File too big')),
    });
    const { user } = await renderLoaded();
    await user.click(screen.getByRole('button', { name: /Pick sprite/i }));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('File too big')).toBeInTheDocument();
  });
});
