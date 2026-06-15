import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import AniListErrorState from './AniListErrorState';

/**
 * Full-bleed error panel shown when an AniList request fails. The raw error
 * message is classified into one of four kinds (api-disabled, rate-limit,
 * network, unknown) which selects a localized title and subtitle. When an
 * `onRetry` handler is supplied a "Try again" button is rendered; otherwise the
 * panel is purely informational. Renders nothing when `error` is `null`.
 */
const meta = {
  title: 'shared/AniListErrorState',
  component: AniListErrorState,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  argTypes: {
    error: {
      description:
        'Raw error message; classified into api-disabled / rate-limit / network / unknown. `null` renders nothing.',
    },
    onRetry: { description: 'When provided, renders a retry button that fires this callback.' },
    className: { description: 'Extra classes merged onto the outer container.' },
  },
} satisfies Meta<typeof AniListErrorState>;

export default meta;

type Story = StoryObj<typeof AniListErrorState>;

export const Network: Story = {
  args: { error: 'Failed to fetch', onRetry: fn() },
};

export const RateLimit: Story = {
  args: { error: '429 rate limit exceeded', onRetry: fn() },
};

export const ApiDisabled: Story = {
  args: { error: 'The API is temporarily disabled', onRetry: fn() },
};

export const Unknown: Story = {
  args: { error: 'Something unexpected went wrong' },
};

export const RetriesOnClick: Story = {
  args: { error: 'Failed to fetch', onRetry: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('button', { name: /try again|spróbuj/i }));
    await expect(args.onRetry).toHaveBeenCalledTimes(1);
  },
};
