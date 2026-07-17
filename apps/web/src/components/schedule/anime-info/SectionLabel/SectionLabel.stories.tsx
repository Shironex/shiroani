import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import SectionLabel from './SectionLabel';

/**
 * The muted caption above each block in the detail dialog. Copy comes from
 * `children`; the bottom margin defaults to `mb-1.5` and callers pass a
 * `className` to nudge the spacing (e.g. `mb-2`) without visual drift.
 */
const meta = {
  title: 'schedule/anime-info/SectionLabel',
  component: SectionLabel,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    children: { control: 'text', description: 'Label copy, e.g. "Genres".' },
    className: { control: 'text', description: 'Spacing override; defaults to mb-1.5.' },
  },
} satisfies Meta<typeof SectionLabel>;

export default meta;

type Story = StoryObj<typeof SectionLabel>;

/** Default spacing — the canonical section caption. */
export const Default: Story = {
  args: { children: 'Genres' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Genres' })).toBeInTheDocument();
  },
};

/** Wider spacing via a className override. */
export const WiderSpacing: Story = {
  args: { children: 'Characters', className: 'mb-2' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Characters' })).toHaveClass('mb-2');
  },
};
