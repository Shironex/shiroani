import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import MascotPreview from './MascotPreview';

/**
 * Miniature stage showing three mascot silhouettes (min / current / max) on a
 * gridded backdrop. The middle chibi tracks the slider's live value; min and max
 * stay pinned as anchors. When a custom sprite is set in the `MascotSpriteStore`
 * the preview switches to it and applies the matching `object-fit` so the macOS
 * preview mirrors the native Win32 overlay.
 */
const meta = {
  title: 'settings/MascotPreview',
  component: MascotPreview,
  parameters: {
    // Decorative chibi images carry empty alt and the stage is presentational,
    // so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    current: { description: 'Live mascot size (px) tracked by the middle chibi.' },
    min: { description: 'Lower size bound (px) — the left anchor chibi.' },
    max: { description: 'Upper size bound (px) — the right anchor chibi.' },
    label: { description: 'Optional uppercase caption rendered above the stage.' },
  },
  beforeEach: () => {
    useMascotSpriteStore.setState({
      customSpriteUrl: null,
      customSpriteFileName: null,
      scaleMode: 'contain',
    });
  },
} satisfies Meta<typeof MascotPreview>;

export default meta;

type Story = StoryObj<typeof MascotPreview>;

export const Default: Story = {
  args: { current: 128, min: 48, max: 256, label: 'Preview' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/128px · OBECNY/)).toBeInTheDocument();
    await expect(canvas.getByText(/48px · MIN/)).toBeInTheDocument();
    await expect(canvas.getByText(/256px · MAX/)).toBeInTheDocument();
  },
};

/** Smallest current value — the middle chibi shrinks to the floor. */
export const SmallMascot: Story = {
  args: { current: 48, min: 48, max: 256, label: 'Preview' },
};

/** With a custom sprite seeded, all three chibis swap to the uploaded image. */
export const CustomSprite: Story = {
  args: { current: 160, min: 48, max: 256, label: 'Preview' },
  beforeEach: () => {
    useMascotSpriteStore.setState({
      customSpriteUrl:
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23b07ab0"/></svg>',
      customSpriteFileName: 'demo.svg',
      scaleMode: 'cover',
    });
  },
};
