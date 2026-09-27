import type {
  FeedCategory,
  FeedGetItemsPayload,
  FeedGetItemsResult,
  FeedItem,
  FeedLanguage,
  FeedSource,
} from '@shiroani/shared';
import { bannerArt, iconArt } from './art';
import { isoAt } from './context';

interface ISourceSeed {
  name: string;
  category: FeedCategory;
  language: FeedLanguage;
  color: string;
}

const SOURCE_SEEDS: ISourceSeed[] = [
  { name: 'Hoshi News Desk', category: 'news', language: 'en', color: '#d46cb1' },
  { name: 'Episode Almanac', category: 'episodes', language: 'en', color: '#5b8def' },
  { name: 'Kumo Reviews', category: 'reviews', language: 'en', color: '#e0a458' },
  { name: 'Wieści z Sakury', category: 'news', language: 'pl', color: '#43aa8b' },
  { name: 'Klub Fanów Chmur', category: 'community', language: 'pl', color: '#9b7ede' },
];

export function feedSources(): FeedSource[] {
  return SOURCE_SEEDS.map((seed, index) => ({
    id: index + 1,
    name: seed.name,
    url: `https://feed${index + 1}.example.invalid/rss.xml`,
    siteUrl: `https://feed${index + 1}.example.invalid`,
    category: seed.category,
    language: seed.language,
    color: seed.color,
    icon: iconArt(index + 2, seed.name.charAt(0)),
    enabled: true,
    pollIntervalMinutes: 60,
    lastFetchedAt: isoAt(0, 18, 45),
    consecutiveFailures: 0,
    supportsFullContent: false,
  }));
}

interface IItemSeed {
  source: number;
  title: string;
  description: string;
  hoursAgo: number;
  categories: string[];
}

const ITEM_SEEDS: IItemSeed[] = [
  {
    source: 1,
    title: 'Lanterns of Hoshizora confirmed for a second season',
    description:
      'The studio announced the sequel at its autumn showcase, with the original staff returning for another cour.',
    hoursAgo: 1,
    categories: ['Announcement'],
  },
  {
    source: 2,
    title: 'Moonlight Relay, episode 6: the anchor leg',
    description: 'The club finally runs the full relay under the stadium lights.',
    hoursAgo: 2,
    categories: ['Episode'],
  },
  {
    source: 4,
    title: 'Paper Crane Courier z polskim dubbingiem od listopada',
    description: 'Wydawca potwierdził obsadę polskiej wersji i datę premiery pierwszych odcinków.',
    hoursAgo: 3,
    categories: ['Zapowiedź'],
  },
  {
    source: 3,
    title: 'Review: Snowfield Signal is the quietest thriller of the year',
    description: 'Eleven episodes, one radio and a lot of snow. Why the slow pace works so well.',
    hoursAgo: 5,
    categories: ['Review'],
  },
  {
    source: 5,
    title: 'Jesienny sezon 2026: nasze typy na weekend',
    description: 'Pięć serii, które warto nadrobić przed kolejnym tygodniem emisji.',
    hoursAgo: 7,
    categories: ['Społeczność'],
  },
  {
    source: 1,
    title: 'Clockwork Tanuki film gets a winter release window',
    description: 'A feature-length story set between the two seasons is in production.',
    hoursAgo: 9,
    categories: ['Film'],
  },
  {
    source: 2,
    title: 'Tidepool Detectives, episode 7: the missing lighthouse key',
    description: 'The crab takes the case personally.',
    hoursAgo: 12,
    categories: ['Episode'],
  },
  {
    source: 3,
    title: 'Foxfire Postal Route is the comfort show of the season',
    description: 'Three episodes in, and every village has been better than the last.',
    hoursAgo: 20,
    categories: ['Review'],
  },
  {
    source: 4,
    title: 'Festiwal animacji w Krakowie ogłasza program',
    description: 'W tym roku wśród pokazów znalazły się trzy premiery kinowe.',
    hoursAgo: 26,
    categories: ['Wydarzenia'],
  },
  {
    source: 1,
    title: 'Iron Garden Knights key visual shows the greenhouse city',
    description: 'A new visual previews the second half of the season.',
    hoursAgo: 30,
    categories: ['Visual'],
  },
];

function feedItems(): FeedItem[] {
  const sources = feedSources();
  return ITEM_SEEDS.map((seed, index) => {
    const source = sources[seed.source - 1];
    const published = isoAt(0, 19 - seed.hoursAgo, 0);
    return {
      id: index + 1,
      feedSourceId: source.id,
      sourceName: source.name,
      sourceColor: source.color,
      sourceIcon: source.icon,
      sourceCategory: source.category,
      sourceLanguage: source.language,
      guid: `showcase-${index + 1}`,
      title: seed.title,
      description: seed.description,
      sourceSupportsFullContent: false,
      url: `${source.siteUrl}/articles/${index + 1}`,
      imageUrl: bannerArt(index + 1),
      publishedAt: published,
      categories: seed.categories,
      createdAt: published,
    };
  });
}

export function feedPage(payload: FeedGetItemsPayload | undefined): FeedGetItemsResult {
  const items = feedItems().filter(item => {
    if (payload?.category && payload.category !== 'all' && item.sourceCategory !== payload.category)
      return false;
    if (payload?.language && payload.language !== 'all' && item.sourceLanguage !== payload.language)
      return false;
    if (payload?.sourceId !== undefined && item.feedSourceId !== payload.sourceId) return false;
    return true;
  });
  return { items, total: items.length, hasMore: false };
}
