import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import StatusPill from './StatusPill';

/**
 * A small status chip with a tinted dot + label, used in the updates section to
 * surface the updater state (idle / available / error). Purely presentational —
 * the tone drives the colour, the text is the label.
 */
const meta = {
  title: 'settings/updates/StatusPill',
  component: StatusPill,
  argTypes: {
    tone: {
      control: 'select',
      options: ['green', 'accent', 'destructive', 'muted'],
      description: 'Colour tone for the pill and its dot.',
    },
    text: { control: 'text', description: 'The status label.' },
  },
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof StatusPill>;

export default meta;

type Story = StoryObj<typeof StatusPill>;

/** Green — up to date. */
export const UpToDate: Story = {
  args: { tone: 'green', text: 'Up to date' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Up to date')).toBeInTheDocument();
  },
};

/** Accent — an update is available or downloading. */
export const Available: Story = {
  args: { tone: 'accent', text: 'Update available' },
};

/** Destructive — the update check failed. */
export const Error: Story = {
  args: { tone: 'destructive', text: 'Update failed' },
};

/** Muted — neutral / unknown state. */
export const Muted: Story = {
  args: { tone: 'muted', text: 'Not checked' },
};
