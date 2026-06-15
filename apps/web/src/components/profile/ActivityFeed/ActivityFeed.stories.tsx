import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn } from 'storybook/test';
import type { AniListActivity } from '@shiroani/shared';
import { ActivityEmpty, ActivityError, ActivityList, ActivityLoading } from './ActivityFeed.parts';
import ActivityFeed from './ActivityFeed';

const activities: AniListActivity[] = [
  {
    type: 'list',
    id: 1,
    status: 'watched episode',
    progress: '12',
    createdAt: 1_717_000_000,
    media: { id: 100, title: { english: 'Frieren' }, coverImage: undefined },
  },
  {
    type: 'text',
    id: 2,
    text: 'Finally finished Spy x Family!',
    createdAt: 1_716_900_000,
  },
];

/**
 * Recent AniList activity feed for the authenticated viewer. The feed is
 * viewer-scoped (resolved from the OAuth token via `useViewerActivity`), so it
 * short-circuits to the "connect" prompt without a connected account — the
 * populated / loading / error states are socket-backed there, so they're shown
 * through the feed's render parts below rather than at the `ActivityFeed` level.
 */
const meta = {
  title: 'profile/ActivityFeed',
  component: ActivityFeed,
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof ActivityFeed>;

export default meta;

type Story = StoryObj<typeof ActivityFeed>;

/**
 * Disconnected — with no connected AniList account the feed short-circuits before
 * any socket call and renders the "connect" prompt.
 */
export const NotConnected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('Connect an AniList account to see your activity here.')
    ).toBeInTheDocument();
  },
};

/** Populated list — media rows (poster + title + status) and free-text rows. */
export const List: StoryObj<typeof ActivityList> = {
  render: () => <ActivityList activities={activities} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Frieren')).toBeInTheDocument();
    await expect(canvas.getByText('Finally finished Spy x Family!')).toBeInTheDocument();
  },
};

/** Loading — three pulsing skeleton rows under an aria-busy region. */
export const Loading: StoryObj<typeof ActivityLoading> = {
  render: () => <ActivityLoading />,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  },
};

/** Error — a message and a retry button that re-runs the fetch. */
export const ErrorState: StoryObj<typeof ActivityError> = {
  render: () => <ActivityError message="Couldn't load your activity feed." onRetry={fn()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Couldn't load your activity feed.")).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  },
};

/** Empty — connected with no entries shows the by-design empty hint. */
export const Empty: StoryObj<typeof ActivityEmpty> = {
  render: () => (
    <ActivityEmpty message="No activity yet — your AniList updates will show up here." />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('No activity yet — your AniList updates will show up here.')
    ).toBeInTheDocument();
  },
};
