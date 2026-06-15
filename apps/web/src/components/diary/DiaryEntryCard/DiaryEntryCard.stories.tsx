import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryEntryCard from './DiaryEntryCard';

const entry: DiaryEntry = {
  id: 1,
  title: 'Pierwszy wpis',
  contentJson: JSON.stringify({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Notatka z dzisiejszego odcinka.' }] },
    ],
  }),
  createdAt: '2025-06-15',
  updatedAt: '2025-06-15',
  isPinned: false,
  coverGradient: 'sakura',
  mood: 'great',
  tags: ['anime', 'recenzja'],
  animeTitle: 'Frieren',
};

/**
 * Compact grid card for a single diary entry — gradient cover header (optional
 * anime thumbnail + pin indicator), title, content preview, date, mood icon and
 * up to two tag chips. The whole card is a single accessible "open" button (a
 * stretched transparent overlay named by the title); the pin/remove actions are
 * separate buttons layered above it so they don't nest inside an interactive
 * container.
 */
const meta = {
  title: 'diary/DiaryEntryCard',
  component: DiaryEntryCard,
  args: {
    onSelect: fn(),
    onRemove: fn(),
    onTogglePin: fn(),
  },
  argTypes: {
    entry: { description: 'The diary entry to render.' },
    onSelect: { description: 'Called with the entry when the card is activated.' },
    onRemove: { description: 'Called with the entry when its remove action is clicked.' },
    onTogglePin: { description: 'Called with the entry when its pin action is toggled.' },
  },
  parameters: {
    // The open-card button is named by the title; pin/remove carry aria-labels.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DiaryEntryCard>;

export default meta;

type Story = StoryObj<typeof DiaryEntryCard>;

/** A fully-populated card: gradient cover, anime link, mood, and tags. */
export const Default: Story = {
  args: { entry },
};

/** A bare card — no cover gradient, mood, anime link or tags. */
export const Minimal: Story = {
  args: {
    entry: {
      id: 2,
      title: 'Krótka notatka',
      contentJson: JSON.stringify({ type: 'doc', content: [] }),
      createdAt: '2025-06-15',
      updatedAt: '2025-06-15',
      isPinned: false,
    },
  },
};

/**
 * Activating the card calls `onSelect`; the pin action calls `onTogglePin`
 * without also selecting the card.
 */
export const Interactions: Story = {
  args: { entry },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pierwszy wpis' }));
    await expect(args.onSelect).toHaveBeenCalledWith(entry);

    await userEvent.click(canvas.getByRole('button', { name: 'Pin' }));
    await expect(args.onTogglePin).toHaveBeenCalledWith(entry);
    // The pin action must not also have triggered selection.
    await expect(args.onSelect).toHaveBeenCalledTimes(1);
  },
};
