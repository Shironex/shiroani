import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import PersonCard from './PersonCard';

/**
 * Reusable avatar + name + subtitle row used for characters and staff in the
 * detail dialog. The avatar uses the person's name as its alt text; when no
 * image is supplied it falls back to a plain placeholder circle.
 */
const meta = {
  title: 'schedule/anime-info/PersonCard',
  component: PersonCard,
  parameters: { a11y: { test: 'error' } },
  argTypes: {
    imageUrl: {
      control: 'text',
      description: 'Avatar image URL; omit for the placeholder circle.',
    },
    name: { control: 'text', description: 'Person name — also used as the avatar alt text.' },
    subtitle: { control: 'text', description: 'Secondary line, e.g. role ("main") or job.' },
  },
} satisfies Meta<typeof PersonCard>;

export default meta;

type Story = StoryObj<typeof PersonCard>;

/** With an avatar image — alt text matches the name. */
export const Default: Story = {
  args: {
    imageUrl: 'https://s4.anilist.co/file/anilistcdn/character/medium/default.png',
    name: 'Frieren',
    subtitle: 'main',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Frieren')).toBeInTheDocument();
    await expect(canvas.getByAltText('Frieren')).toBeInTheDocument();
  },
};

/** No image — renders the placeholder circle instead of an <img>. */
export const NoImage: Story = {
  args: {
    name: 'Fern',
    subtitle: 'supporting',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Fern')).toBeInTheDocument();
    await expect(canvas.queryByRole('img')).not.toBeInTheDocument();
  },
};
