import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useAppStatsStore } from '@/stores/useAppStatsStore';
import { mockAppStatsSnapshot } from '../profile-fixtures';
import InAppStatsPanel from './InAppStatsPanel';

const EMPTY_SNAPSHOT = {
  version: 1 as const,
  createdAt: null,
  totals: { appOpenSeconds: 0, appActiveSeconds: 0, animeWatchSeconds: 0, sessionCount: 0 },
  byDay: {},
  currentStreak: { days: 0, lastDay: null },
  longestStreak: { days: 0, lastDay: null },
};

/**
 * "In app" tab body — local time-spent stats: a hero line, three counter cards,
 * the activity heatmap, a streak strip and a clear-stats action that opens a
 * confirm dialog. Fed by the local app-stats tracker; the mount effect's poll
 * no-ops outside Electron, so stories stay socket-free once the store is seeded.
 */
const meta = {
  title: 'profile/InAppStatsPanel',
  component: InAppStatsPanel,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useAppStatsStore.setState({ snapshot: mockAppStatsSnapshot });
  },
} satisfies Meta<typeof InAppStatsPanel>;

export default meta;

type Story = StoryObj<typeof InAppStatsPanel>;

/** Populated — hero, counter cards, heatmap and streak strip all render. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Your time with ShiroAni')).toBeInTheDocument();
    await expect(canvas.getByText('App open')).toBeInTheDocument();
    await expect(canvas.getByText('Activity in the last 12 weeks')).toBeInTheDocument();
    await expect(canvas.getByRole('grid')).toBeInTheDocument();
  },
};

/**
 * Clicking "Clear stats" opens the portalled confirm dialog; cancelling closes
 * it again (leaving the panel focusable for the post-play a11y check).
 */
export const ConfirmReset: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Clear stats' }));

    // ConfirmDialog (Radix) portals to document.body.
    const body = within(canvasElement.ownerDocument.body);
    await expect(await body.findByText('Clear stats?')).toBeInTheDocument();
    await userEvent.click(await body.findByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(body.queryByText('Clear stats?')).not.toBeInTheDocument());
  },
};

/** Empty tracker — the hero shows the "journey is just beginning" copy. */
export const Empty: Story = {
  beforeEach: () => {
    useAppStatsStore.setState({ snapshot: EMPTY_SNAPSHOT });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Your journey is just beginning · stay a little longer')
    ).toBeInTheDocument();
  },
};
