import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryTimeline from './DiaryTimeline';

const today = new Date().toISOString();

const entries: DiaryEntry[] = [
  {
    id: 1,
    title: 'Dzisiejszy odcinek',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Świetny finał sezonu.' }] }],
    }),
    createdAt: today,
    updatedAt: today,
    isPinned: true,
    mood: 'great',
    tags: ['finał', 'anime'],
    animeTitle: 'Frieren',
  },
  {
    id: 2,
    title: 'Notatka',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: today,
    updatedAt: today,
    isPinned: false,
  },
];

/**
 * List view for diary entries — entries grouped under day headers ("Today ·
 * 19.04 · Friday"), each a wide row card with a timeline dot, cover thumbnail,
 * meta row (anime link + time), excerpt, mood icon, and a tag cloud. Each row
 * is a `button`-role region; pin/remove actions live in a hover cluster and
 * stop event propagation so they don't also trigger row selection.
 */
const meta = {
  title: 'diary/DiaryTimeline',
  component: DiaryTimeline,
  args: {
    onSelect: fn(),
    onRemove: fn(),
    onTogglePin: fn(),
  },
  argTypes: {
    entries: { description: 'Diary entries to group and render as timeline rows.' },
    onSelect: { description: 'Called with the entry when a row is activated.' },
    onRemove: { description: 'Called with the entry when its remove action is clicked.' },
    onTogglePin: { description: 'Called with the entry when its pin action is toggled.' },
  },
  parameters: {
    // Row cards carry accessible names via their title text; pin/remove buttons
    // carry aria-labels. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DiaryTimeline>;

export default meta;

type Story = StoryObj<typeof DiaryTimeline>;

/** Two entries under one day header — a pinned, fully-populated row and a bare one. */
export const Default: Story = {
  args: { entries },
};

/**
 * Activating a row calls `onSelect` with that entry; clicking the row's pin
 * action calls `onTogglePin` instead, without bubbling to `onSelect`.
 */
export const Interactions: Story = {
  args: { entries },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // The unpinned "Notatka" row is one accessible button named by its title.
    await userEvent.click(canvas.getByRole('button', { name: 'Notatka' }));
    await expect(args.onSelect).toHaveBeenCalledWith(entries[1]);

    // The pin action fires onTogglePin only (it doesn't also select the row).
    await userEvent.click(canvas.getByRole('button', { name: 'Pin' }));
    await expect(args.onTogglePin).toHaveBeenCalledWith(entries[1]);
  },
};
