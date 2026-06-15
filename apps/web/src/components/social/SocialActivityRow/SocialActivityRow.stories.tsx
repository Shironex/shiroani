import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AniListActivity } from '@shiroani/shared';
import SocialActivityRow from './SocialActivityRow';

const CREATED_AT = 1_717_000_000;
const author = {
  id: 9,
  name: 'Mochi',
  avatar: 'https://s4.anilist.co/file/anilistcdn/user/avatar/medium/default.png',
};

/**
 * A single row in the community activity feed. The `list` variant pairs a poster
 * thumb with a media title + status line; the `text` variant renders a freeform
 * post. Both carry the author (avatar + handle + relative time) because the feed
 * aggregates many followed users. Purely presentational — fully driven by `item`.
 */
const meta = {
  title: 'social/SocialActivityRow',
  component: SocialActivityRow,
  parameters: {
    // Author/poster images carry alt text and decorative icons are aria-hidden,
    // so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    item: {
      description:
        'The activity to render. Discriminated on `type`: `list` (media update with status/progress) or `text` (freeform post). Optional `user` is the author.',
    },
  },
} satisfies Meta<typeof SocialActivityRow>;

export default meta;

type Story = StoryObj<typeof SocialActivityRow>;

const listActivity: AniListActivity = {
  type: 'list',
  id: 1,
  status: 'watched episode',
  progress: '12',
  createdAt: CREATED_AT,
  media: {
    id: 100,
    title: { english: 'Frieren: Beyond Journey’s End' },
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
  user: author,
};

const textActivity: AniListActivity = {
  type: 'text',
  id: 2,
  text: 'Finally caught up — this season is unreal.',
  createdAt: CREATED_AT,
  user: author,
};

const listNoAuthor: AniListActivity = {
  type: 'list',
  id: 3,
  status: 'completed',
  createdAt: CREATED_AT,
  media: { id: 200, title: { english: 'Spy x Family' } },
};

export const ListActivity: Story = { args: { item: listActivity } };
export const TextActivity: Story = { args: { item: textActivity } };
export const ListWithoutAuthor: Story = { args: { item: listNoAuthor } };
