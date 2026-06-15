import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import DiscordPreview from './DiscordPreview';

/**
 * Presentational Discord-style presence card that mirrors how a user's activity
 * appears on their Discord profile. It is driven entirely by props — the
 * details/state lines, the optional elapsed-time line, the large image tile,
 * and the AniList button (which only shows for `watching` / `diary` activities
 * when `showButton` is on). It holds no state and triggers no IO.
 */
const meta = {
  title: 'settings/DiscordPreview',
  component: DiscordPreview,
  parameters: {
    // The card is pure presentation (no interactive controls); its text passes
    // axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    details: { control: 'text', description: 'First presence line (description).' },
    state: { control: 'text', description: 'Second presence line (state).' },
    showTimestamp: { control: 'boolean', description: 'Show the elapsed-time line.' },
    showLargeImage: { control: 'boolean', description: 'Show the large cover tile.' },
    showButton: {
      control: 'boolean',
      description: 'Show the AniList button (watching/diary activities only).',
    },
    activityType: {
      control: 'select',
      options: ['watching', 'browsing', 'library', 'diary', 'schedule', 'settings', 'idle'],
      description: 'Activity type — gates the watching visuals and AniList button.',
    },
  },
} satisfies Meta<typeof DiscordPreview>;

export default meta;

type Story = StoryObj<typeof DiscordPreview>;

/** A watching presence with every element shown, including the AniList button. */
export const Watching: Story = {
  args: {
    details: 'Watching One Piece',
    state: 'Episode 1000',
    showTimestamp: true,
    showLargeImage: true,
    showButton: true,
    activityType: 'watching',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('ShiroAni')).toBeInTheDocument();
    await expect(canvas.getByText('Watching One Piece')).toBeInTheDocument();
    await expect(canvas.getByText('Episode 1000')).toBeInTheDocument();
    // The AniList button surfaces for a watching activity with showButton on.
    await expect(canvas.getByText('Show on AniList')).toBeInTheDocument();
  },
};

/** A browsing presence — non-watching, so the AniList button is suppressed. */
export const Browsing: Story = {
  args: {
    details: 'Browsing',
    state: '',
    showTimestamp: false,
    showLargeImage: true,
    showButton: true,
    activityType: 'browsing',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Browsing')).toBeInTheDocument();
    // Non-watching activity drops the AniList button even with showButton on.
    await expect(canvas.queryByText('Show on AniList')).not.toBeInTheDocument();
    // showTimestamp off hides the elapsed line.
    await expect(canvas.queryByText('Elapsed 00:42:15')).not.toBeInTheDocument();
  },
};
