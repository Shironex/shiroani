import { createLogger, extractErrorMessage, toLocalDate } from '@shiroani/shared';
import type { AiringAnime } from '@shiroani/shared';
import { AnimeService } from '../anime/anime.service';
import type { AniListAiringSchedule } from '../anime/types';

const logger = createLogger('ScheduleService');

export class ScheduleService {
  constructor(private readonly animeService: AnimeService) {
    logger.info('ScheduleService initialized');
  }

  /**
   * Get airing anime for a specific day (ISO date string YYYY-MM-DD).
   * Returns AiringAnime[] mapped from AniList data.
   */
  async getDaily(date: string): Promise<{ date: string; entries: AiringAnime[]; error?: string }> {
    logger.debug(`Fetching daily schedule for ${date}`);
    try {
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);

      const result = await this.animeService.getAiringSchedule(startOfDay, endOfDay, 1, 50);
      const entries = result.airingSchedules.map(mapAiringScheduleToAiringAnime);

      logger.debug(`Found ${entries.length} airing anime for ${date}`);
      return { date, entries };
    } catch (error) {
      const msg = extractErrorMessage(error);
      logger.error(`Failed to fetch daily schedule for ${date}: ${msg}`);
      return { date, entries: [], error: msg };
    }
  }

  /**
   * Get airing anime for a full week starting from startDate (ISO date string YYYY-MM-DD).
   * Returns a map of date -> AiringAnime[].
   */
  async getWeekly(
    startDate: string
  ): Promise<{ schedule: Record<string, AiringAnime[]>; error?: string }> {
    logger.debug(`Fetching weekly schedule from ${startDate}`);
    try {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59);

      // Fetch all entries for the week (up to 50 per page, paginate if needed)
      let allSchedules: AniListAiringSchedule[] = [];
      let page = 1;
      let hasNext = true;

      while (hasNext && page <= 5) {
        const result = await this.animeService.getAiringSchedule(start, end, page, 50);
        allSchedules = allSchedules.concat(result.airingSchedules);
        hasNext = result.pageInfo.hasNextPage;
        page++;
      }

      // Group by local date
      const schedule: Record<string, AiringAnime[]> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        schedule[toLocalDate(d)] = [];
      }

      for (const entry of allSchedules) {
        const d = new Date(entry.airingAt * 1000);
        const key = toLocalDate(d);
        if (schedule[key]) {
          schedule[key].push(mapAiringScheduleToAiringAnime(entry));
        }
      }

      const totalEntries = Object.values(schedule).reduce((sum, arr) => sum + arr.length, 0);
      logger.debug(`Found ${totalEntries} airing anime for week starting ${startDate}`);
      return { schedule };
    } catch (error) {
      const msg = extractErrorMessage(error);
      logger.error(`Failed to fetch weekly schedule: ${msg}`);
      return { schedule: {}, error: msg };
    }
  }
}

/**
 * Map AniList airing schedule entry to our shared AiringAnime type.
 */
function mapAiringScheduleToAiringAnime(entry: AniListAiringSchedule): AiringAnime {
  const media = entry.media;
  return {
    id: entry.id,
    airingAt: entry.airingAt,
    episode: entry.episode,
    media: {
      id: media.id,
      title: media.title,
      coverImage: media.coverImage || {},
      episodes: media.episodes,
      status: media.status,
      format: media.format,
      genres: media.genres || [],
      averageScore: media.averageScore,
      popularity: media.popularity,
    },
  };
}
