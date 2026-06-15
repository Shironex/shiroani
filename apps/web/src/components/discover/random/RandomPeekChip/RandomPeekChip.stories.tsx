import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiscoverMedia } from '@/stores/useDiscoverStore';
import RandomPeekChip from './RandomPeekChip';

const media: DiscoverMedia = {
  id: 1,
  title: { english: 'Frieren: Beyond Journey’s End' },
  coverImage: {
    medium: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
};

/**
 * Compact prev/next chip beneath the Random showcase card. A button labelled by
 * its direction and title that jumps the carousel to the adjacent pick. The
 * thumbnail is decorative (`alt=""`, `aria-hidden`) and the button name comes
 * from `aria-label`, so axe runs clean.
 */
const meta = {
  title: 'discover/random/RandomPeekChip',
  component: RandomPeekChip,
  parameters: { a11y: { test: 'error' } },
  args: { media, onClick: fn(), inLibrary: false },
  argTypes: {
    direction: {
      control: 'inline-radio',
      options: ['prev', 'next'],
      description: 'Whether the chip points at the previous or next pick.',
    },
    inLibrary: {
      control: 'boolean',
      description: 'Shows a check glyph when the title is in the library.',
    },
    onClick: { description: 'Called when the chip is activated.' },
  },
} satisfies Meta<typeof RandomPeekChip>;

export default meta;

type Story = StoryObj<typeof RandomPeekChip>;

/** Previous-direction chip — activating it jumps to the prior pick. */
export const Previous: Story = {
  args: { direction: 'prev' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Previous: Frieren: Beyond Journey’s End' })
    );
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** Next-direction chip — marked as already in the library. */
export const Next: Story = {
  args: { direction: 'next', inLibrary: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('button', { name: 'Next: Frieren: Beyond Journey’s End' })
    ).toBeInTheDocument();
  },
};
