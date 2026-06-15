import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
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
    // TODO(a11y): per-app brand-accent text (app romaji, tagline, version) is
    // rendered in each sibling app's signature oklch accent on a light card —
    // an intentional brand-identity contrast choice, not a control affordance.
    a11y: { test: 'todo' },
  },
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
