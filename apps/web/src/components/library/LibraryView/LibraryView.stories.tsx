import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, waitFor } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useScheduleStore } from '@/stores/useScheduleStore';
import LibraryView from './LibraryView';

/**
 * Top-level Library screen — header (search, filters, sort, view-mode, batch
 * toggle, stats, import/export), the virtualized grid/list, the batch action
 * bar, and the detail/confirm/import/export dialogs.
 *
 * Stories seed `useLibraryStore` AND `useScheduleStore` so the view is fully
 * socket-free: `useNextAiringMap` only calls `fetchWeekly` when the schedule is
 * empty, and that emit opens the socket (autoConnect on the emit helper), which
 * then reconnects forever against the dead test backend — pegging the headless
 * Chromium page until it crashes. Seeding a non-empty schedule short-circuits
 * the effect, so no connection is ever attempted. See the root-cause note in
 * the README/handoff.
 */
const meta = {
  title: 'library/LibraryView',
  component: LibraryView,
  parameters: {
    layout: 'fullscreen',
    // Empty-state + header stories pass axe clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    // Non-empty schedule → useNextAiringMap's effect short-circuits → no socket.
    useScheduleStore.setState({ schedule: { '2025-01-01': [] }, isLoading: false });
  },
} satisfies Meta<typeof LibraryView>;

export default meta;

type Story = StoryObj<typeof LibraryView>;

const EMPTY_STATE = {
  entries: [],
  activeFilter: 'all' as const,
  searchQuery: '',
  sortBy: 'updatedAt' as const,
  sortOrder: 'desc' as const,
  viewMode: 'grid' as const,
  isLoading: false,
  error: null,
  isDetailOpen: false,
  selectedEntry: null,
  selectionMode: false,
  selectedIds: new Set<number>(),
};

/**
 * Empty library — a stable, non-loading, error-free state with no entries, so
 * the view renders its header and the "library is empty" CTA without a backend.
 * Populated grid/list states are exercised in the per-component stories and
 * LibraryView.test.tsx.
 */
export const Default: Story = {
  beforeEach: () => {
    useLibraryStore.setState(EMPTY_STATE);
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Header + empty-state CTA render without a backend.
    await expect(canvas.getByRole('heading', { name: 'Library' })).toBeInTheDocument();
    await expect(canvas.getByText('Your library is empty')).toBeInTheDocument();
  },
};

/**
 * Loading — the skeleton grid is shown while the initial fetch is in flight.
 */
export const Loading: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ ...EMPTY_STATE, isLoading: true });
  },
};

/**
 * Failed initial fetch — shows a "couldn't load" retry CTA, NOT the empty-state
 * CTA, because the user's collection isn't gone.
 */
export const LoadError: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ ...EMPTY_STATE, error: 'network down' });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Couldn't load your library")).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // The empty-state CTA must NOT appear on a load error.
    await expect(canvas.queryByText('Your library is empty')).not.toBeInTheDocument();
  },
};

/**
 * Search with no matches — distinct from the empty library: shows the
 * "no results" hint rather than the onboarding CTA.
 */
export const NoSearchResults: Story = {
  beforeEach: () => {
    useLibraryStore.setState({ ...EMPTY_STATE, searchQuery: 'zzz-no-such-title' });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('No results')).toBeInTheDocument());
  },
};
