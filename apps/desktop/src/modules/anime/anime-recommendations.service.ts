import { Injectable } from '@nestjs/common';
import { createLogger, extractErrorMessage } from '@shiroani/shared';
import type {
  AniListCommunityRecommendation,
  SaveRecommendationRequest,
  RecommendationRating,
} from '@shiroani/shared';
import { AniListClient } from './anilist-client';
import { RECOMMENDATIONS_QUERY, SAVE_RECOMMENDATION_MUTATION } from './queries';
import type {
  AniListRecommendationEntry,
  AniListRecommendationMedia,
  RecommendationsResponse,
  SaveRecommendationResponse,
} from './types';

const logger = createLogger('AnimeRecommendationsService');

/**
 * AniList community recommendations: browsing the pairings and casting /
 * clearing the connected viewer's vote. Extracted from AnimeService so the
 * discover/browse core stays focused on media browsing.
 */
@Injectable()
export class AnimeRecommendationsService {
  constructor(private readonly anilistClient: AniListClient) {
    logger.info('AnimeRecommendationsService initialized');
  }

  /**
   * Browse community recommendations (item C5), optionally seeded by a source
   * `mediaId`. Sorted by net community vote. `userRating` reflects the connected
   * viewer's own vote (NO_RATING when unauthed — the selection does not error
   * unauthenticated, so this works for everyone). Entries whose source or
   * recommended media was deleted are skipped.
   */
  async getRecommendations(mediaId?: number): Promise<AniListCommunityRecommendation[]> {
    logger.info(
      mediaId
        ? `Fetching community recommendations seeded by media ${mediaId}`
        : 'Fetching community recommendations'
    );
    try {
      const data = await this.anilistClient.query<RecommendationsResponse>(RECOMMENDATIONS_QUERY, {
        perPage: 30,
        mediaId,
      });
      const nodes = data.Page?.recommendations ?? [];
      return nodes
        .map(node => this.mapRecommendation(node))
        .filter((r): r is AniListCommunityRecommendation => r !== null);
    } catch (error) {
      logger.error(`Failed to fetch community recommendations: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Vote on a community recommendation (item C4). Casts (RATE_UP/RATE_DOWN) or
   * clears (NO_RATING) the connected viewer's vote on a (media,
   * mediaRecommendation) pairing. Authed — returns `null` when not connected so
   * the caller can no-op rather than surface an auth error; otherwise returns the
   * resulting `userRating`.
   */
  async saveRecommendation(input: SaveRecommendationRequest): Promise<RecommendationRating | null> {
    if (!(await this.anilistClient.hasToken())) {
      logger.debug('saveRecommendation: not connected, returning null');
      return null;
    }

    logger.info(
      `Voting ${input.rating} on recommendation ${input.mediaId} -> ${input.mediaRecommendationId}`
    );
    try {
      const data = await this.anilistClient.query<SaveRecommendationResponse>(
        SAVE_RECOMMENDATION_MUTATION,
        {
          mediaId: input.mediaId,
          mediaRecommendationId: input.mediaRecommendationId,
          rating: input.rating,
        }
      );
      return data.SaveRecommendation?.userRating ?? 'NO_RATING';
    } catch (error) {
      logger.error(`Failed to save recommendation vote: ${extractErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Map a raw `Page.recommendations` node to the shared
   * {@link AniListCommunityRecommendation}. Returns null when either side's media
   * was deleted (can't render a pairing with a missing anime).
   */
  private mapRecommendation(
    node: AniListRecommendationEntry | null
  ): AniListCommunityRecommendation | null {
    if (!node) return null;
    const media = this.mapRecommendationMedia(node.media);
    const mediaRecommendation = this.mapRecommendationMedia(node.mediaRecommendation);
    if (!media || !mediaRecommendation) return null;
    return {
      id: node.id,
      rating: node.rating ?? 0,
      userRating: node.userRating ?? 'NO_RATING',
      media,
      mediaRecommendation,
    };
  }

  /** Map a recommendation media node to the shared flat shape (null when absent). */
  private mapRecommendationMedia(
    media: AniListRecommendationMedia | null
  ): AniListCommunityRecommendation['media'] | null {
    if (!media) return null;
    return {
      id: media.id,
      title: {
        romaji: media.title?.romaji ?? undefined,
        english: media.title?.english ?? undefined,
        native: media.title?.native ?? undefined,
      },
      coverImage: media.coverImage?.large ?? media.coverImage?.medium,
      format: media.format ?? undefined,
      averageScore: media.averageScore ?? undefined,
    };
  }
}
