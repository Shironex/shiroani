import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import type { UserProfile } from '@shiroani/shared';
import StudioBreakdown from './StudioBreakdown';

type Studios = UserProfile['statistics']['studios'];

const studios = [
  { name: 'MAPPA', count: 32 },
  { name: 'Wit Studio', count: 18 },
  { name: 'Bones', count: 12 },
  { name: 'Ufotable', count: 9 },
] as unknown as Studios;

/**
 * Ranked list of the user's most-watched studios — each row pairs the studio
 * name with a count pill, the top row accented. Presentational; falls back to a
 * muted hint when there is no data.
 */
const meta = {
  title: 'profile/StudioBreakdown',
  component: StudioBreakdown,
  parameters: {
    // Text rows + count pills — axe clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    studios: {
      description: 'AniList `statistics.studios` (name + count); shown in incoming order.',
    },
    limit: {
      control: { type: 'number' },
      description: 'How many top studios to show (default 4).',
    },
  },
} satisfies Meta<typeof StudioBreakdown>;

export default meta;

type Story = StoryObj<typeof StudioBreakdown>;

/** Populated — the leading studio is accented, the rest muted. */
export const Default: Story = {
  args: { studios },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('MAPPA')).toBeInTheDocument();
    await expect(canvas.getByText('32')).toBeInTheDocument();
  },
};

/** `limit` caps the visible rows. */
export const Limited: Story = {
  args: { studios, limit: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('MAPPA')).toBeInTheDocument();
    await expect(canvas.getByText('Wit Studio')).toBeInTheDocument();
    await expect(canvas.queryByText('Bones')).not.toBeInTheDocument();
  },
};

/** Empty — the muted fallback hint replaces the rows. */
export const Empty: Story = {
  args: { studios: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('No studio data yet.')).toBeInTheDocument();
  },
};
