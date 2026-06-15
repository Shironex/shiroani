import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { withAppSurface } from '../../../../.storybook/decorators';
import SuiteSection from './SuiteSection';

/**
 * The "app family" panel: an intro card plus a card per sibling app
 * (Shiranami, KireiManga) with a preview screenshot and an "Open" CTA that
 * launches the app's site in a new tab.
 */
const meta = {
  title: 'settings/SuiteSection',
  component: SuiteSection,
  parameters: {
    layout: 'fullscreen',
    // Readable text (romaji headings, taglines, descriptions, CTA) uses theme
    // tokens / dark-ink-on-accent and meets AA on the app surface. The only
    // brand-accent glyphs are the decorative kanji watermark + the kanji echo of
    // the romaji name, both aria-hidden + data-a11y-decorative (excluded from the
    // scan in preview.tsx). The app-surface decorator supplies the opaque themed
    // background so axe measures the accents against it, not the bare canvas.
    a11y: { test: 'error' },
  },
  decorators: [withAppSurface],
} satisfies Meta<typeof SuiteSection>;

export default meta;

type Story = StoryObj<typeof SuiteSection>;

/** Renders a card for each sibling app. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: /Shiranami/ })).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: /KireiManga/ })).toBeInTheDocument();
  },
};

/** The "Open" CTA launches the app's site in a new tab. */
export const OpenApp: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const open = fn();
    const original = window.open;
    window.open = open as typeof window.open;
    try {
      await userEvent.click(canvas.getByRole('button', { name: /Check out Shiranami/ }));
      await expect(open).toHaveBeenCalledWith(
        'https://shiranami.app',
        '_blank',
        'noopener,noreferrer'
      );
    } finally {
      window.open = original;
    }
  },
};
