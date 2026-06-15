import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AniListActivity } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import ActivityFeed from './ActivityFeed';
import { ActivityEmpty, ActivityError, ActivityList, ActivityLoading } from './ActivityFeed.parts';

beforeEach(() => {
  // Disconnected: the feed short-circuits before any socket call.
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
});

describe('ActivityFeed', () => {
  it('shows the connect prompt when no AniList account is connected', () => {
    render(<ActivityFeed />);
    expect(
      screen.getByText('Connect an AniList account to see your activity here.')
    ).toBeInTheDocument();
  });
});

describe('ActivityList', () => {
  it('renders a media row with its title and a free-text row', () => {
    const activities: AniListActivity[] = [
      {
        type: 'list',
        id: 1,
        status: 'watched episode',
        progress: '12',
        createdAt: 1_717_000_000,
        media: { id: 100, title: { english: 'Frieren' }, coverImage: undefined },
      },
      { type: 'text', id: 2, text: 'Finished Spy x Family!', createdAt: 1_716_900_000 },
    ];
    render(<ActivityList activities={activities} />);
    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.getByText('watched episode · 12')).toBeInTheDocument();
    expect(screen.getByText('Finished Spy x Family!')).toBeInTheDocument();
  });

  it('falls back to a placeholder poster when the media has no cover image', () => {
    const activities: AniListActivity[] = [
      {
        type: 'list',
        id: 1,
        status: 'completed',
        progress: '',
        createdAt: 1_717_000_000,
        media: { id: 100, title: { romaji: 'Sousou no Frieren' }, coverImage: undefined },
      },
    ];
    render(<ActivityList activities={activities} />);
    // No cover → no <img>, romaji title used as the fallback display title.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Sousou no Frieren')).toBeInTheDocument();
  });
});

describe('ActivityLoading', () => {
  it('renders a busy skeleton region', () => {
    const { container } = render(<ActivityLoading />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

describe('ActivityError', () => {
  it('renders the message and calls onRetry', async () => {
    const onRetry = vi.fn();
    const { user } = render(
      <ActivityError message="Couldn't load your activity feed." onRetry={onRetry} />
    );
    expect(screen.getByText("Couldn't load your activity feed.")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('ActivityEmpty', () => {
  it('renders the supplied empty message', () => {
    render(<ActivityEmpty message="No activity yet." />);
    expect(screen.getByText('No activity yet.')).toBeInTheDocument();
  });
});
