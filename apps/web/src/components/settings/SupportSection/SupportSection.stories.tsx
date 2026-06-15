import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { BUY_ME_A_COFFEE_URL } from '@/lib/constants';
import SupportSection from './SupportSection';

/**
 * The "support the project" panel: a short pitch plus two CTAs that open the
 * Buy-Me-a-Coffee and GitHub Sponsors pages in a new tab.
 */
const meta = {
  title: 'settings/SupportSection',
  component: SupportSection,
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof SupportSection>;

export default meta;

type Story = StoryObj<typeof SupportSection>;

/** Renders the support card with both CTAs. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Support ShiroAni')).toBeInTheDocument();
  },
};

/** The primary CTA opens the Buy-Me-a-Coffee page. */
export const OpenCoffee: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const open = fn();
    const original = window.open;
    window.open = open as typeof window.open;
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Buy me a coffee' }));
      await expect(open).toHaveBeenCalledWith(BUY_ME_A_COFFEE_URL, '_blank', 'noopener,noreferrer');
    } finally {
      window.open = original;
    }
  },
};
