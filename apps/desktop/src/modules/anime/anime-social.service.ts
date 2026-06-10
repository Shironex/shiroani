import { Injectable } from '@nestjs/common';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import type {
  AniListActivity,
  AniListActivityUser,
  AniListUser,
  AniListNotification,
  AniListNotificationMedia,
  AniListNotificationUser,
  GetNotificationsResult,
} from '@shiroani/shared';
import { AniListClient } from './anilist-client';
import {
  VIEWER_ACTIVITY_QUERY,
  FOLLOWING_QUERY,
  FOLLOWERS_QUERY,
  TOGGLE_FOLLOW_MUTATION,
  SOCIAL_FEED_QUERY,
  NOTIFICATIONS_QUERY,
  MARK_NOTIFICATIONS_READ_QUERY,
} from './queries';
import type {
  AniListActivityNode,
  AniListActivityUserNode,
  AniListFollowUserNode,
  AniListNotificationNode,
  AniListNotificationMediaNode,
  AniListNotificationUserNode,
  ViewerActivityResponse,
  SocialFeedResponse,
  FollowingResponse,
  FollowersResponse,
  ToggleFollowResponse,
  NotificationsResponse,
} from './types';

const logger = createLogger('AnimeSocialService');

/**
 * AniList social surface: the viewer's own activity feed, follow lists and
 * the follow toggle, the following-users activity feed, and notifications.
 * Extracted from AnimeService so the discover/browse core doesn't carry the
 * activity/notification mapping surface.
 */
@Injectable()
export class AnimeSocialService {
  constructor(private readonly anilistClient: AniListClient) {
    logger.info('AnimeSocialService initialized');
  }

  /**
   * Fetch the connected viewer's recent AniList activity feed (list + text
   * activities, newest first). Resolves the viewer id via {@link
   * AniListClient.getViewer}, then pages the activity union. Returns [] when not
   * connected.
   */
  async getViewerActivity(): Promise<AniListActivity[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getViewerActivity: not connected, returning empty feed');
      return [];
    }

    logger.info('Fetching connected viewer AniList activity feed');
    try {
      const viewer = await this.anilistClient.getViewer();
      const data = await this.anilistClient.query<ViewerActivityResponse>(VIEWER_ACTIVITY_QUERY, {
        userId: viewer.id,
      });
      const nodes = data.Page?.activities ?? [];
      return nodes
        .map(node => this.mapActivity(node))
        .filter((a): a is AniListActivity => a !== null);
    } catch (error) {
      logger.error(`Failed to fetch viewer activity: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the people a user FOLLOWS. Resolves the target id via the optional
   * `userId` arg, falling back to the connected viewer's own id. Returns [] when
   * not connected (no token) so callers can render a "connect your account"
   * state. `isFollowing` on each entry reflects the connected viewer's own
   * follow state (drives the follow/unfollow toggle).
   */
  async getFollowing(userId?: number): Promise<AniListUser[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getFollowing: not connected, returning empty list');
      return [];
    }

    logger.info('Fetching AniList following list');
    try {
      const targetId = userId ?? (await this.anilistClient.getViewer()).id;
      const data = await this.anilistClient.query<FollowingResponse>(FOLLOWING_QUERY, {
        userId: targetId,
      });
      const nodes = data.Page?.following ?? [];
      return nodes
        .map(node => this.mapFollowUser(node))
        .filter((u): u is AniListUser => u !== null);
    } catch (error) {
      logger.error(`Failed to fetch following list: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the people who FOLLOW a user. Mirror of {@link getFollowing} via
   * `Page.followers`. Returns [] when not connected.
   */
  async getFollowers(userId?: number): Promise<AniListUser[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getFollowers: not connected, returning empty list');
      return [];
    }

    logger.info('Fetching AniList followers list');
    try {
      const targetId = userId ?? (await this.anilistClient.getViewer()).id;
      const data = await this.anilistClient.query<FollowersResponse>(FOLLOWERS_QUERY, {
        userId: targetId,
      });
      const nodes = data.Page?.followers ?? [];
      return nodes
        .map(node => this.mapFollowUser(node))
        .filter((u): u is AniListUser => u !== null);
    } catch (error) {
      logger.error(`Failed to fetch followers list: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Follow or unfollow an AniList user (AniList `ToggleFollow` flips the current
   * state). Returns the NEW follow state, or `null` when not connected so the
   * caller can no-op rather than surface an auth error. Authed.
   */
  async toggleFollow(userId: number): Promise<boolean | null> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('toggleFollow: not connected, returning null');
      return null;
    }

    logger.info(`Toggling follow state for AniList user ${userId}`);
    try {
      const data = await this.anilistClient.query<ToggleFollowResponse>(TOGGLE_FOLLOW_MUTATION, {
        userId,
      });
      return data.ToggleFollow?.isFollowing ?? false;
    } catch (error) {
      logger.error(`Failed to toggle follow for user ${userId}: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the social activity feed of the people the connected viewer FOLLOWS
   * (list + text activities, newest first). `activities(isFollowing: true)` is
   * token-relative, so this does NOT resolve or pass a `userId` (unlike
   * {@link getViewerActivity}) — it only guards on `hasToken`. Each activity
   * carries its author via `user`. Returns [] when not connected.
   */
  async getSocialFeed(): Promise<AniListActivity[]> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getSocialFeed: not connected, returning empty feed');
      return [];
    }

    logger.info('Fetching AniList social (following) activity feed');
    try {
      const data = await this.anilistClient.query<SocialFeedResponse>(SOCIAL_FEED_QUERY);
      const nodes = data.Page?.activities ?? [];
      return nodes
        .map(node => this.mapActivity(node))
        .filter((a): a is AniListActivity => a !== null);
    } catch (error) {
      logger.error(`Failed to fetch social feed: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Fetch the connected viewer's notifications (airing / following / activity
   * like-reply-mention / related-media), newest first, plus the unread count for
   * the badge. A single query selects both `Viewer.unreadNotificationCount` and
   * `Page.notifications` (read-only — `resetNotificationCount: false`). Returns
   * `{ notifications: [], unreadCount: 0 }` when not connected. Entries whose
   * required media/user was deleted, and unhandled union members, are dropped.
   */
  async getNotifications(): Promise<GetNotificationsResult> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('getNotifications: not connected, returning empty result');
      return { notifications: [], unreadCount: 0 };
    }

    logger.info('Fetching connected viewer AniList notifications');
    try {
      const data = await this.anilistClient.query<NotificationsResponse>(NOTIFICATIONS_QUERY);
      const nodes = data.Page?.notifications ?? [];
      const notifications = nodes
        .map(node => this.mapNotification(node))
        .filter((n): n is AniListNotification => n !== null);
      const unreadCount = data.Viewer?.unreadNotificationCount ?? 0;
      return { notifications, unreadCount };
    } catch (error) {
      logger.error(`Failed to fetch notifications: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Clear the connected viewer's unread notification count. AniList resets the
   * count as a side-effect of `notifications(resetNotificationCount: true)`, so
   * this fires that minimal query and discards the payload. Returns `0` (the new
   * unread count) — also `0` when not connected (a no-op, no query). Authed.
   */
  async markNotificationsRead(): Promise<number> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('markNotificationsRead: not connected, no-op');
      return 0;
    }

    logger.info('Clearing AniList unread notification count');
    try {
      await this.anilistClient.query(MARK_NOTIFICATIONS_READ_QUERY);
      return 0;
    } catch (error) {
      logger.error(`Failed to mark notifications read: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Map a single raw notification node to the shared {@link AniListNotification}
   * union, switching on `__typename`. Returns null for union members we don't
   * surface, or a variant whose required `media`/`user` was deleted, so the caller
   * can filter them out. The four activity-* AniList types collapse into one
   * `'activity'` variant (their `context` string carries the like/reply/mention
   * distinction). `createdAt` defaults to 0 when AniList omits it.
   */
  private mapNotification(node: AniListNotificationNode | null): AniListNotification | null {
    if (!node) return null;

    const createdAt = node.createdAt ?? 0;

    switch (node.__typename) {
      case 'AiringNotification': {
        const media = this.mapNotificationMedia(node.media);
        if (!media) return null;
        return {
          type: 'airing',
          id: node.id,
          context: this.joinAiringContext(node.contexts, node.episode, media),
          createdAt,
          episode: node.episode ?? 0,
          media,
        };
      }

      case 'FollowingNotification': {
        const user = this.mapNotificationUser(node.user);
        if (!user) return null;
        return {
          type: 'following',
          id: node.id,
          context: node.context ?? '',
          createdAt,
          user,
        };
      }

      case 'ActivityLikeNotification':
      case 'ActivityReplyNotification':
      case 'ActivityMentionNotification': {
        const user = this.mapNotificationUser(node.user);
        if (!user) return null;
        return {
          type: 'activity',
          id: node.id,
          context: node.context ?? '',
          createdAt,
          activityId: node.activityId ?? 0,
          user,
        };
      }

      case 'RelatedMediaAdditionNotification': {
        const media = this.mapNotificationMedia(node.media);
        if (!media) return null;
        return {
          type: 'related-media',
          id: node.id,
          context: node.context ?? '',
          createdAt,
          media,
        };
      }

      default:
        return null;
    }
  }

  /**
   * Build a single display context for an airing notification. AniList ships the
   * phrasing split into a `contexts` array (e.g. ["Episode ", " of ", " aired."])
   * meant to wrap the episode number and title; we interleave them into one
   * string. Falls back to a sensible default when `contexts` is absent.
   */
  private joinAiringContext(
    contexts: Array<string | null> | null | undefined,
    episode: number | null | undefined,
    media: AniListNotificationMedia
  ): string {
    const title = media.title.romaji ?? media.title.english ?? media.title.native ?? 'Unknown';
    const parts = (contexts ?? []).filter((c): c is string => c != null);
    if (parts.length >= 3) {
      // ["Episode ", " of ", " aired."] → "Episode 12 of <title> aired."
      return `${parts[0]}${episode ?? ''}${parts[1]}${title}${parts.slice(2).join('')}`;
    }
    if (parts.length > 0) {
      return parts.join('');
    }
    return `Episode ${episode ?? ''} of ${title} aired.`.replace('  ', ' ');
  }

  /** Map a raw notification media node to the shared flat shape (null when absent). */
  private mapNotificationMedia(
    media: AniListNotificationMediaNode | null | undefined
  ): AniListNotificationMedia | null {
    if (!media) return null;
    return {
      id: media.id,
      title: {
        romaji: media.title?.romaji ?? undefined,
        english: media.title?.english ?? undefined,
        native: media.title?.native ?? undefined,
      },
      coverImage: media.coverImage?.large ?? media.coverImage?.medium,
    };
  }

  /** Map a raw notification user node to the shared shape (null when absent). */
  private mapNotificationUser(
    user: AniListNotificationUserNode | null | undefined
  ): AniListNotificationUser | null {
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar?.large ?? user.avatar?.medium ?? undefined,
    };
  }

  /**
   * Map a single raw activity node to the shared {@link AniListActivity} union.
   * Returns null for entries we don't surface (MessageActivity, or a ListActivity
   * whose media was deleted) so the caller can filter them out. Shared by the OWN
   * viewer feed (no `user` selected → left undefined) and the SOCIAL feed (each
   * entry carries its author via `user`).
   */
  private mapActivity(node: AniListActivityNode | null): AniListActivity | null {
    if (!node) return null;

    if (node.__typename === 'ListActivity') {
      const media = node.media;
      if (!media) return null;
      return {
        type: 'list',
        id: node.id,
        status: node.status ?? undefined,
        progress: node.progress ?? undefined,
        media: {
          id: media.id,
          title: {
            romaji: media.title?.romaji ?? undefined,
            english: media.title?.english ?? undefined,
            native: media.title?.native ?? undefined,
          },
          coverImage: media.coverImage?.large ?? media.coverImage?.medium,
        },
        createdAt: node.createdAt,
        user: this.mapActivityUser(node.user),
      };
    }

    if (node.__typename === 'TextActivity') {
      return {
        type: 'text',
        id: node.id,
        text: node.text ?? '',
        createdAt: node.createdAt,
        user: this.mapActivityUser(node.user),
      };
    }

    return null;
  }

  /**
   * Map a raw activity author node to the shared {@link AniListActivityUser}.
   * Returns `undefined` when the node is absent — the own-viewer feed doesn't
   * select `user`, so list/text activities from there stay author-less.
   */
  private mapActivityUser(
    node: AniListActivityUserNode | null | undefined
  ): AniListActivityUser | undefined {
    if (!node) return undefined;
    return {
      id: node.id,
      name: node.name,
      avatar: node.avatar?.large ?? node.avatar?.medium ?? undefined,
    };
  }

  /**
   * Map a raw following/followers user node to the shared {@link AniListUser}.
   * Returns null when the node is absent (deleted/unresolvable account) so the
   * caller can filter it out.
   */
  private mapFollowUser(node: AniListFollowUserNode | null): AniListUser | null {
    if (!node) return null;
    return {
      id: node.id,
      name: node.name,
      avatar: node.avatar?.large ?? node.avatar?.medium ?? undefined,
      isFollowing: node.isFollowing ?? undefined,
      siteUrl: node.siteUrl ?? undefined,
    };
  }
}
