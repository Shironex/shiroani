import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { DiaryEntry } from '@shiroani/shared';
import DiaryEntryGrid from './DiaryEntryGrid';

const entries: DiaryEntry[] = [
  {
    id: 1,
    title: 'Pierwszy wpis',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Notatka.' }] }],
    }),
    createdAt: '2025-06-15',
    updatedAt: '2025-06-15',
    isPinned: true,
    coverGradient: 'sakura',
    mood: 'great',
    tags: ['anime'],
  },
  {
    id: 2,
    title: 'Drugi wpis',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: '2025-06-14',
    updatedAt: '2025-06-14',
    isPinned: false,
    coverGradient: 'ocean',
  },
];

/**
 * Switches between two diary layouts driven by `viewMode`: a card `grid` (a
 * column of `DiaryEntryCard`s) and a compact `list` (one slim, clickable row per
 * entry with a gradient accent bar). Selection/pin/remove are delegated to the
 * cards in grid mode; list rows are select-only.
 */
const meta = {
  title: 'diary/DiaryEntryGrid',
  component: DiaryEntryGrid,
  args: {
    onSelect: fn(),
    onRemove: fn(),
    onTogglePin: fn(),
  },
  argTypes: {
    viewMode: {
      control: 'inline-radio',
      options: ['grid', 'list'],
      description: 'Card grid vs. compact list layout.',
    },
    entries: { description: 'Diary entries to render.' },
    onSelect: { description: 'Called with the entry when a card/row is activated.' },
    onRemove: { description: 'Called with the entry when its remove action is clicked (grid).' },
    onTogglePin: { description: 'Called with the entry when its pin action is toggled (grid).' },
  },
  parameters: {
    // Grid cards expose named open/pin/remove buttons; list rows are named
    // button-role regions. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DiaryEntryGrid>;

export default meta;

type Story = StoryObj<typeof DiaryEntryGrid>;

/** Card grid layout. */
export const Grid: Story = {
  args: { entries, viewMode: 'grid' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Pierwszy wpis' }));
    await expect(args.onSelect).toHaveBeenCalledWith(entries[0]);
  },
};

/** Compact list layout. */
export const List: Story = {
  args: { entries, viewMode: 'list' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // List rows are select-only button-role regions.
    const rows = canvas.getAllByRole('button');
    await userEvent.click(rows[0]!);
    await expect(args.onSelect).toHaveBeenCalledWith(entries[0]);
  },
};
