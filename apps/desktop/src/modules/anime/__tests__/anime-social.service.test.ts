import { AnimeSocialService } from '../anime-social.service';
import type { AniListClient } from '../anilist-client';
import type {
  AniListActivityNode,
  AniListNotificationNode,
  ViewerActivityResponse,
  SocialFeedResponse,
  FollowingResponse,
  FollowersResponse,
  ToggleFollowResponse,
  NotificationsResponse,
} from '../types';

/** Minimal AniListClient mock covering the methods the service under test calls. */
function makeClient(
  overrides: Partial<jest.Mocked<AniListClient>> = {}
): jest.Mocked<
  Pick<AniListClient, 'query' | 'cachedQuery' | 'hasToken' | 'getViewer' | 'saveMediaListEntry'>
> {
  return {
    query: jest.fn(),
    cachedQuery: jest.fn(),
    hasToken: jest.fn().mockResolvedValue(false),
    getViewer: jest.fn(),
    saveMediaListEntry: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<
    Pick<AniListClient, 'query' | 'cachedQuery' | 'hasToken' | 'getViewer' | 'saveMediaListEntry'>
  >;
}

describe('AnimeSocialService viewer activity', () => {
  describe('getViewerActivity', () => {
    it('returns [] when not connected, without querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const activities = await service.getViewerActivity();

      expect(activities).toEqual([]);
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps list + text activities and drops messages/null/media-less entries', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      const nodes: Array<AniListActivityNode | null> = [
        {
          __typename: 'ListActivity',
          id: 11,
          status: 'watched episode',
          progress: '12 - 13',
          createdAt: 1700,
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: null as unknown as string },
            coverImage: { large: 'cover.png' },
          },
        },
        { __typename: 'TextActivity', id: 12, text: 'Great episode!', createdAt: 1600 },
        // MessageActivity — dropped.
        { __typename: 'MessageActivity', id: 13, createdAt: 1500 },
        // ListActivity with deleted media — dropped.
        { __typename: 'ListActivity', id: 14, status: 'completed', createdAt: 1400, media: null },
        null,
      ];
      client.query.mockResolvedValue({ Page: { activities: nodes } } as ViewerActivityResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const activities = await service.getViewerActivity();

      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 7 });
      expect(activities).toEqual([
        {
          type: 'list',
          id: 11,
          status: 'watched episode',
          progress: '12 - 13',
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: undefined, native: undefined },
            coverImage: 'cover.png',
          },
          createdAt: 1700,
        },
        { type: 'text', id: 12, text: 'Great episode!', createdAt: 1600 },
      ]);
    });

    it('tolerates a null Page (empty feed)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      client.query.mockResolvedValue({ Page: null } as ViewerActivityResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.getViewerActivity()).resolves.toEqual([]);
    });
  });
});

describe('AnimeSocialService social graph + following feed', () => {
  describe('getFollowing / getFollowers', () => {
    it('returns [] when not connected, without resolving the viewer or querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.getFollowing()).resolves.toEqual([]);
      await expect(service.getFollowers()).resolves.toEqual([]);
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('resolves the viewer id and maps following users (drops null nodes)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      client.query.mockResolvedValue({
        Page: {
          following: [
            {
              id: 10,
              name: 'Loid',
              avatar: { large: 'loid-large.png', medium: 'loid-medium.png' },
              isFollowing: true,
              siteUrl: 'https://anilist.co/user/Loid',
            },
            // No avatar.large → falls back to medium; null isFollowing/siteUrl dropped.
            { id: 11, name: 'Yor', avatar: { medium: 'yor-medium.png' }, isFollowing: null },
            null,
          ],
        },
      } as FollowingResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const users = await service.getFollowing();

      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 7 });
      expect(users).toEqual([
        {
          id: 10,
          name: 'Loid',
          avatar: 'loid-large.png',
          isFollowing: true,
          siteUrl: 'https://anilist.co/user/Loid',
        },
        {
          id: 11,
          name: 'Yor',
          avatar: 'yor-medium.png',
          isFollowing: undefined,
          siteUrl: undefined,
        },
      ]);
    });

    it('honors an explicit userId arg (does not resolve the viewer)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Page: { followers: [] } } as FollowersResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await service.getFollowers(99);

      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 99 });
    });

    it('maps followers and tolerates a null Page (empty list)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.getViewer.mockResolvedValue({ id: 7, name: 'Anya' });
      client.query.mockResolvedValue({ Page: null } as FollowersResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.getFollowers()).resolves.toEqual([]);
    });
  });

  describe('toggleFollow', () => {
    it('returns null when not connected, without mutating', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const result = await service.toggleFollow(10);

      expect(result).toBeNull();
      expect(client.query).not.toHaveBeenCalled();
    });

    it('toggles follow and returns the new isFollowing state', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({
        ToggleFollow: { id: 10, isFollowing: true },
      } as ToggleFollowResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const result = await service.toggleFollow(10);

      expect(result).toBe(true);
      expect(client.query).toHaveBeenCalledWith(expect.any(String), { userId: 10 });
    });

    it('falls back to false when the mutation returns a null payload', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ ToggleFollow: null } as ToggleFollowResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.toggleFollow(10)).resolves.toBe(false);
    });
  });

  describe('getSocialFeed', () => {
    it('returns [] when not connected, without querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.getSocialFeed()).resolves.toEqual([]);
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps list + text activities WITH their author, never resolving the viewer', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      const nodes: Array<AniListActivityNode | null> = [
        {
          __typename: 'ListActivity',
          id: 21,
          status: 'watched episode',
          progress: '5',
          createdAt: 2100,
          user: { id: 10, name: 'Loid', avatar: { large: 'loid.png' } },
          media: {
            id: 200,
            title: { romaji: 'Frieren', english: null as unknown as string },
            coverImage: { large: 'cover.png' },
          },
        },
        {
          __typename: 'TextActivity',
          id: 22,
          text: 'Peanuts!',
          createdAt: 2000,
          user: { id: 11, name: 'Anya', avatar: { medium: 'anya-medium.png' } },
        },
        // ListActivity with deleted media — dropped.
        { __typename: 'ListActivity', id: 23, createdAt: 1900, media: null },
        null,
      ];
      client.query.mockResolvedValue({ Page: { activities: nodes } } as SocialFeedResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const activities = await service.getSocialFeed();

      // The social feed is token-relative — it must NOT resolve a userId.
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(client.query).toHaveBeenCalledWith(expect.any(String));
      expect(activities).toEqual([
        {
          type: 'list',
          id: 21,
          status: 'watched episode',
          progress: '5',
          media: {
            id: 200,
            title: { romaji: 'Frieren', english: undefined, native: undefined },
            coverImage: 'cover.png',
          },
          createdAt: 2100,
          user: { id: 10, name: 'Loid', avatar: 'loid.png' },
        },
        {
          type: 'text',
          id: 22,
          text: 'Peanuts!',
          createdAt: 2000,
          user: { id: 11, name: 'Anya', avatar: 'anya-medium.png' },
        },
      ]);
    });

    it('tolerates a null Page (empty feed)', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Page: null } as SocialFeedResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.getSocialFeed()).resolves.toEqual([]);
    });
  });
});

describe('AnimeSocialService notifications', () => {
  describe('getNotifications', () => {
    it('returns empty result when not connected, without querying', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.getNotifications()).resolves.toEqual({
        notifications: [],
        unreadCount: 0,
      });
      expect(client.query).not.toHaveBeenCalled();
    });

    it('maps every variant, drops unknown/null/required-field-missing entries', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      const nodes: Array<AniListNotificationNode | null> = [
        {
          __typename: 'AiringNotification',
          id: 1,
          type: 'AIRING',
          episode: 12,
          contexts: ['Episode ', ' of ', ' aired.'],
          createdAt: 1700,
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: null as unknown as string },
            coverImage: { large: 'cover.png' },
          },
        },
        {
          __typename: 'FollowingNotification',
          id: 2,
          type: 'FOLLOWING',
          context: 'followed you',
          createdAt: 1690,
          user: { id: 10, name: 'Loid', avatar: { large: 'loid.png' } },
        },
        {
          __typename: 'ActivityLikeNotification',
          id: 3,
          type: 'ACTIVITY_LIKE',
          context: 'liked your activity',
          activityId: 555,
          createdAt: 1680,
          user: { id: 11, name: 'Yor', avatar: { medium: 'yor-medium.png' } },
        },
        {
          __typename: 'ActivityReplyNotification',
          id: 4,
          type: 'ACTIVITY_REPLY',
          context: 'replied to your activity',
          activityId: 556,
          createdAt: 1670,
          user: { id: 12, name: 'Anya' },
        },
        {
          __typename: 'ActivityMentionNotification',
          id: 5,
          type: 'ACTIVITY_MENTION',
          context: 'mentioned you in an activity',
          activityId: 557,
          createdAt: 1660,
          user: { id: 13, name: 'Bond' },
        },
        {
          __typename: 'RelatedMediaAdditionNotification',
          id: 6,
          type: 'RELATED_MEDIA_ADDITION',
          context: 'was recently added to the site',
          createdAt: 1650,
          media: { id: 200, title: { romaji: 'Spy x Family' }, coverImage: { medium: 'sxf.png' } },
        },
        // Unhandled union member — dropped.
        { __typename: 'ActivityMessageNotification', id: 7, createdAt: 1640 },
        // Airing with deleted media — dropped.
        { __typename: 'AiringNotification', id: 8, episode: 1, createdAt: 1630, media: null },
        // Following with deleted user — dropped.
        { __typename: 'FollowingNotification', id: 9, createdAt: 1620, user: null },
        null,
      ];
      client.query.mockResolvedValue({
        Viewer: { unreadNotificationCount: 4 },
        Page: { notifications: nodes },
      } as NotificationsResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const result = await service.getNotifications();

      // Read-only: must NOT reset, must NOT resolve a viewer id.
      expect(client.query).toHaveBeenCalledWith(expect.any(String));
      expect(client.getViewer).not.toHaveBeenCalled();
      expect(result.unreadCount).toBe(4);
      expect(result.notifications).toEqual([
        {
          type: 'airing',
          id: 1,
          context: 'Episode 12 of Frieren aired.',
          createdAt: 1700,
          episode: 12,
          media: {
            id: 100,
            title: { romaji: 'Frieren', english: undefined, native: undefined },
            coverImage: 'cover.png',
          },
        },
        {
          type: 'following',
          id: 2,
          context: 'followed you',
          createdAt: 1690,
          user: { id: 10, name: 'Loid', avatar: 'loid.png' },
        },
        {
          type: 'activity',
          id: 3,
          context: 'liked your activity',
          createdAt: 1680,
          activityId: 555,
          user: { id: 11, name: 'Yor', avatar: 'yor-medium.png' },
        },
        {
          type: 'activity',
          id: 4,
          context: 'replied to your activity',
          createdAt: 1670,
          activityId: 556,
          user: { id: 12, name: 'Anya', avatar: undefined },
        },
        {
          type: 'activity',
          id: 5,
          context: 'mentioned you in an activity',
          createdAt: 1660,
          activityId: 557,
          user: { id: 13, name: 'Bond', avatar: undefined },
        },
        {
          type: 'related-media',
          id: 6,
          context: 'was recently added to the site',
          createdAt: 1650,
          media: {
            id: 200,
            title: { romaji: 'Spy x Family', english: undefined, native: undefined },
            coverImage: 'sxf.png',
          },
        },
      ]);
    });

    it('falls back to a default airing context when contexts is absent', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({
        Viewer: { unreadNotificationCount: 1 },
        Page: {
          notifications: [
            {
              __typename: 'AiringNotification',
              id: 1,
              episode: 5,
              createdAt: 1700,
              media: { id: 100, title: { english: 'Bocchi the Rock!' }, coverImage: {} },
            },
          ],
        },
      } as NotificationsResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      const result = await service.getNotifications();

      expect(result.notifications[0]).toMatchObject({
        type: 'airing',
        context: 'Episode 5 of Bocchi the Rock! aired.',
      });
    });

    it('defaults unreadCount to 0 and tolerates a null Page', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Viewer: null, Page: null } as NotificationsResponse);
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.getNotifications()).resolves.toEqual({
        notifications: [],
        unreadCount: 0,
      });
    });
  });

  describe('markNotificationsRead', () => {
    it('returns 0 without querying when not connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(false) });
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.markNotificationsRead()).resolves.toBe(0);
      expect(client.query).not.toHaveBeenCalled();
    });

    it('fires the reset query and returns 0 when connected', async () => {
      const client = makeClient({ hasToken: jest.fn().mockResolvedValue(true) });
      client.query.mockResolvedValue({ Page: { notifications: [] } });
      const service = new AnimeSocialService(client as unknown as AniListClient);

      await expect(service.markNotificationsRead()).resolves.toBe(0);
      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(expect.any(String));
    });
  });
});
