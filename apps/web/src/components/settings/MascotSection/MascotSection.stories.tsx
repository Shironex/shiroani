import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import MascotSection from './MascotSection';

/**
 * Fake overlay bridge so the section's mount effect resolves and flips its
 * `loaded` gate to true (otherwise it renders nothing in Storybook, where no
 * Electron bridge exists). Every method is a `fn()` the play tests assert
 * against. Reassigned per story and read back from this module-level handle.
 */
let overlay = makeOverlay();

function makeOverlay() {
  return {
    isEnabled: fn().mockResolvedValue(true),
    getSize: fn().mockResolvedValue(128),
    getVisibilityMode: fn().mockResolvedValue('always'),
    isPositionLocked: fn().mockResolvedValue(false),
    isAnimationEnabled: fn().mockResolvedValue(true),
    setEnabled: fn().mockResolvedValue({ success: true }),
    setSize: fn().mockResolvedValue({ success: true }),
    setVisibilityMode: fn().mockResolvedValue({ success: true }),
    setPositionLocked: fn().mockResolvedValue({ success: true }),
    setAnimationEnabled: fn().mockResolvedValue({ success: true }),
    resetPosition: fn().mockResolvedValue({ success: true }),
    setSpriteScale: fn().mockResolvedValue(undefined),
  };
}

function installOverlay() {
  overlay = makeOverlay();
  (window as unknown as { electronAPI?: unknown }).electronAPI = { overlay };
}

/**
 * Desktop-mascot settings card. The header switch enables the overlay; with it
 * on, the card reveals a live `MascotPreview`, a size slider, a custom-sprite
 * picker (which gates a scale-mode select), a visibility-mode select, lock and
 * animation toggles and a reset-position action. State is read from the overlay
 * bridge on mount and mirrored into the `MascotSpriteStore`; stories install a
 * fake bridge so the section renders past its `loaded` gate without Electron.
 */
const meta = {
  title: 'settings/MascotSection',
  component: MascotSection,
  parameters: {
    // The size slider carries aria-label (forwarded to the role="slider" thumb),
    // the selects/switches are labelled by their rows and the buttons are named,
    // so axe passes clean.
    a11y: { test: 'error' },
  },
  beforeEach: () => {
    installOverlay();
    useMascotSpriteStore.setState({
      customSpriteUrl: null,
      customSpriteFileName: null,
      scaleMode: 'contain',
    });
  },
} satisfies Meta<typeof MascotSection>;

export default meta;

type Story = StoryObj<typeof MascotSection>;

/** Mascot enabled — the full set of controls is visible. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('Desktop mascot');
    await expect(canvas.getByRole('slider', { name: 'Mascot size' })).toBeInTheDocument();
    await expect(canvas.getByText('128px')).toBeInTheDocument();
  },
};

/** Nudging the size slider debounces a resize through the overlay bridge. */
export const NudgeSize: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const slider = await canvas.findByRole('slider', { name: 'Mascot size' });
    slider.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByText('136px')).toBeInTheDocument();
    // The native resize is debounced ~150ms after the value changes.
    await waitFor(() => expect(overlay.setSize).toHaveBeenCalledWith(136));
  },
};

/** Picking a visibility option pushes the new mode to the overlay bridge. */
export const ChangeVisibility: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('combobox', { name: 'Visibility mode' }));
    // Radix Select content portals to document.body.
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await body.findByRole('option', { name: 'Only when window is minimised' })
    );
    await waitFor(() => expect(overlay.setVisibilityMode).toHaveBeenCalledWith('tray-only'));
  },
};

/** With a custom sprite seeded, the scale-mode select appears and drives the bridge. */
export const WithCustomSprite: Story = {
  beforeEach: () => {
    useMascotSpriteStore.setState({
      customSpriteUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23b07ab0"/></svg>',
      customSpriteFileName: 'demo.svg',
      scaleMode: 'contain',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('Sprite scaling');
    await expect(canvas.getByRole('button', { name: /Change/i })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('combobox', { name: 'Sprite scaling' }));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole('option', { name: 'Fill (crop edges)' }));
    await waitFor(() => expect(overlay.setSpriteScale).toHaveBeenCalledWith('cover'));
  },
};
