/**
 * The invented anime every showcase view draws from. Titles, studios and
 * synopses are made up for the screenshots; ids are arbitrary and never point
 * at a real AniList entry.
 */
import { coverArt } from './art';

export interface IShowcaseTitle {
  id: number;
  english: string;
  romaji: string;
  format: 'TV' | 'MOVIE' | 'OVA' | 'ONA';
  episodes: number;
  genres: string[];
  averageScore: number;
  popularity: number;
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
  seasonYear: number;
  status: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED';
  studio: string;
  description: string;
}

export const CATALOGUE: IShowcaseTitle[] = [
  {
    id: 910001,
    english: 'Lanterns of Hoshizora',
    romaji: 'Hoshizora no Tomoshibi',
    format: 'TV',
    episodes: 12,
    genres: ['Slice of Life', 'Fantasy'],
    averageScore: 86,
    popularity: 48210,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Studio Kumoji',
    description:
      'A lamplighter apprentice keeps the floating lanterns of a mountain town burning, one quiet night at a time.',
  },
  {
    id: 910002,
    english: 'Paper Crane Courier',
    romaji: 'Orizuru Binmaru',
    format: 'TV',
    episodes: 24,
    genres: ['Adventure', 'Comedy'],
    averageScore: 81,
    popularity: 39120,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Lantern Works',
    description:
      'Letters folded into cranes fly themselves across the city, and one courier has to catch the ones that get lost.',
  },
  {
    id: 910003,
    english: 'The Quiet Shrine Keeper',
    romaji: 'Shizuka na Yashiro no Mori',
    format: 'TV',
    episodes: 13,
    genres: ['Slice of Life', 'Mystery'],
    averageScore: 84,
    popularity: 27400,
    season: 'SUMMER',
    seasonYear: 2026,
    status: 'FINISHED',
    studio: 'Hakumei Animation',
    description:
      'A retired detective takes over a tiny hillside shrine and finds that every visitor brings a small puzzle.',
  },
  {
    id: 910004,
    english: 'Starlit Bakery on Route 9',
    romaji: 'Kyuu-gou-sen no Hoshiya Pan',
    format: 'TV',
    episodes: 12,
    genres: ['Comedy', 'Slice of Life'],
    averageScore: 79,
    popularity: 22150,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Paperplane Studio',
    description:
      'A roadside bakery opens only after midnight, and its regulars are travellers who are not quite from this world.',
  },
  {
    id: 910005,
    english: 'Clockwork Tanuki',
    romaji: 'Karakuri Tanuki',
    format: 'TV',
    episodes: 24,
    genres: ['Action', 'Comedy', 'Supernatural'],
    averageScore: 77,
    popularity: 51840,
    season: 'SPRING',
    seasonYear: 2026,
    status: 'FINISHED',
    studio: 'Studio Kumoji',
    description:
      'A shape-shifting tanuki built from brass gears tries to pass as a high school student. It is not going well.',
  },
  {
    id: 910006,
    english: 'Tidepool Detectives',
    romaji: 'Isoda Tanteidan',
    format: 'TV',
    episodes: 12,
    genres: ['Mystery', 'Comedy'],
    averageScore: 82,
    popularity: 18730,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Lantern Works',
    description:
      'Three kids and a very serious hermit crab solve the small crimes of a seaside village.',
  },
  {
    id: 910007,
    english: 'Moonlight Relay',
    romaji: 'Tsukiakari Rire',
    format: 'TV',
    episodes: 12,
    genres: ['Sports', 'Drama'],
    averageScore: 85,
    popularity: 33090,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Hakumei Animation',
    description:
      'A night-running club with four members and one borrowed track enters the prefectural relay.',
  },
  {
    id: 910008,
    english: 'Snowfield Signal',
    romaji: 'Setsugen Shingou',
    format: 'TV',
    episodes: 11,
    genres: ['Sci-Fi', 'Drama'],
    averageScore: 88,
    popularity: 45620,
    season: 'WINTER',
    seasonYear: 2026,
    status: 'FINISHED',
    studio: 'Paperplane Studio',
    description:
      'At a research station at the edge of the world, a radio operator starts receiving messages from next week.',
  },
  {
    id: 910009,
    english: 'Ramen After Midnight',
    romaji: 'Mayonaka Ramen',
    format: 'TV',
    episodes: 12,
    genres: ['Slice of Life', 'Romance'],
    averageScore: 76,
    popularity: 20410,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Studio Kumoji',
    description: 'Two night-shift workers meet at the same ramen stall every night at 2 a.m.',
  },
  {
    id: 910010,
    english: 'Violet Harbor Academy',
    romaji: 'Sumire Minato Gakuen',
    format: 'TV',
    episodes: 24,
    genres: ['Romance', 'Drama', 'School'],
    averageScore: 74,
    popularity: 29880,
    season: 'SUMMER',
    seasonYear: 2026,
    status: 'FINISHED',
    studio: 'Lantern Works',
    description:
      'A transfer student at a harbour-town academy joins the lighthouse club, which has not had a new member in ten years.',
  },
  {
    id: 910011,
    english: 'Foxfire Postal Route',
    romaji: 'Kitsunebi Yuubin',
    format: 'TV',
    episodes: 12,
    genres: ['Fantasy', 'Adventure'],
    averageScore: 83,
    popularity: 25510,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Hakumei Animation',
    description:
      'A fox spirit carries mail between villages that only appear on the map during festivals.',
  },
  {
    id: 910012,
    english: 'Summer Cicada Radio',
    romaji: 'Natsuzemi Rajio',
    format: 'MOVIE',
    episodes: 1,
    genres: ['Drama', 'Music'],
    averageScore: 87,
    popularity: 30760,
    season: 'SUMMER',
    seasonYear: 2025,
    status: 'FINISHED',
    studio: 'Paperplane Studio',
    description:
      'A pirate radio station run from a rice-field shed plays its last summer broadcast.',
  },
  {
    id: 910013,
    english: 'Iron Garden Knights',
    romaji: 'Tetsu no Niwa no Kishidan',
    format: 'TV',
    episodes: 24,
    genres: ['Action', 'Mecha'],
    averageScore: 78,
    popularity: 41270,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Studio Kumoji',
    description: 'Gardeners pilot giant iron golems to protect the last greenhouse city.',
  },
  {
    id: 910014,
    english: 'The Seventh Lighthouse',
    romaji: 'Nanabanme no Toudai',
    format: 'TV',
    episodes: 12,
    genres: ['Mystery', 'Supernatural'],
    averageScore: 80,
    popularity: 19640,
    season: 'SPRING',
    seasonYear: 2026,
    status: 'FINISHED',
    studio: 'Lantern Works',
    description: 'Six lighthouses guard the bay. Nobody remembers who built the seventh.',
  },
  {
    id: 910015,
    english: 'Cloudcatcher Club',
    romaji: 'Kumotori-bu',
    format: 'TV',
    episodes: 12,
    genres: ['Comedy', 'School', 'Slice of Life'],
    averageScore: 75,
    popularity: 16920,
    season: 'FALL',
    seasonYear: 2026,
    status: 'RELEASING',
    studio: 'Hakumei Animation',
    description: 'A school club dedicated to photographing clouds that look like other things.',
  },
  {
    id: 910016,
    english: 'Tea House at the Edge of the Map',
    romaji: 'Chizu no Hate no Chaya',
    format: 'OVA',
    episodes: 4,
    genres: ['Fantasy', 'Slice of Life'],
    averageScore: 82,
    popularity: 14380,
    season: 'WINTER',
    seasonYear: 2026,
    status: 'FINISHED',
    studio: 'Paperplane Studio',
    description: 'Every traveller who reaches the tea house has one story left to tell.',
  },
];

export function titleById(id: number): IShowcaseTitle {
  const found = CATALOGUE.find(t => t.id === id);
  if (!found) throw new Error(`showcase: unknown fixture title ${id}`);
  return found;
}

export function coverOf(title: IShowcaseTitle): string {
  return coverArt(title.id - 910000);
}
