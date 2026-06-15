import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { DiaryEntry } from '@shiroani/shared';
import DiarySidebar from './DiarySidebar';

const today = new Date();

function dayOffset(days: number): string {
  const d = new Date(today);
  d.setDate(today.getDate() - days);
  return d.toISOString();
}

/** A few consecutive days of entries so streak / heatmap / tag stats populate. */
const entries: DiaryEntry[] = [
  {
    id: 1,
    title: 'Dziś',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: dayOffset(0),
    updatedAt: dayOffset(0),
    isPinned: false,
    tags: ['anime', 'recenzja'],
  },
  {
    id: 2,
    title: 'Wczoraj',
    contentJson: JSON.stringify({ type: 'doc', content: [] }),
    createdAt: dayOffset(1),
    updatedAt: dayOffset(1),
    isPinned: false,
    tags: ['anime'],
  },
];

/**
 * Right-hand stat panel on the Diary view — a streak card (progress toward the
 * next milestone), a 2×2 stat grid, a 52-week activity heatmap (decorative,
 * `aria-hidden`, with a less/more legend), a popular-tags block, and
 * genre/studio breakdowns. Every value is derived from the entries it's handed
 * — no network calls on mount when no entry links to a library anime.
 */
const meta = {
  title: 'diary/DiarySidebar',
  component: DiarySidebar,
  argTypes: {
    entries: { description: 'Diary entries the panel derives all of its stats from.' },
  },
  parameters: {
    // The decorative heatmap is aria-hidden with a text legend; all labelled
    // stats and headings carry accessible text. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DiarySidebar>;

export default meta;

type Story = StoryObj<typeof DiarySidebar>;

/** Populated — derived streak, stats, heatmap and tags from a small entry set. */
export const Default: Story = {
  args: { entries },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Current streak')).toBeInTheDocument();
    // The popular-tags block surfaces the most-used tag with its count.
    await expect(canvas.getByText('#anime · 2')).toBeInTheDocument();
  },
};

/**
 * Empty — the panel still renders its landmark with zeroed stats and the
 * heatmap's "no activity" placeholder instead of a grid.
 */
export const Empty: Story = {
  args: { entries: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No activity')).toBeInTheDocument();
  },
};
