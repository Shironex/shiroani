import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AniListNotification } from '@shiroani/shared';
import NotificationRow from './NotificationRow';

const CREATED_AT = 1_717_000_000;

const meta = {
  title: 'social/NotificationRow',
  component: NotificationRow,
} satisfies Meta<typeof NotificationRow>;

export default meta;

type Story = StoryObj<typeof NotificationRow>;

const airing: AniListNotification = {
  type: 'airing',
  id: 1,
  context: 'Episode 12 of Frieren: Beyond Journey’s End aired.',
  createdAt: CREATED_AT,
  episode: 12,
  media: {
    id: 100,
    title: { english: 'Frieren: Beyond Journey’s End', romaji: 'Sousou no Frieren' },
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/nx154587.jpg',
  },
};

const following: AniListNotification = {
  type: 'following',
  id: 2,
  context: 'Mochi started following you.',
  createdAt: CREATED_AT,
  user: {
    id: 9,
    name: 'Mochi',
    avatar: 'https://s4.anilist.co/file/anilistcdn/user/avatar/medium/default.png',
  },
};

const activity: AniListNotification = {
  type: 'activity',
  id: 3,
  context: 'Yuki liked your activity.',
  createdAt: CREATED_AT,
  activityId: 555,
  user: { id: 11, name: 'Yuki' },
};

const related: AniListNotification = {
  type: 'related-media',
  id: 4,
  context: 'A sequel to Spy x Family was added to AniList.',
  createdAt: CREATED_AT,
  media: { id: 200, title: { english: 'Spy x Family' } },
};

export const Airing: Story = { args: { notification: airing } };
export const Following: Story = { args: { notification: following } };
export const ActivityLiked: Story = { args: { notification: activity } };
export const RelatedMedia: Story = { args: { notification: related } };
