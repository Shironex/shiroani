import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { useMalAuthStore } from '@/stores/useMalAuthStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import MalStep from './MalStep';

/**
 * Onboarding step 09 · MyAnimeList account (optional). The MAL twin of
 * {@link AniListStep}: connects MyAnimeList so that list and profile sync, with
 * the token held main-side. Entirely optional — nothing here gates the wizard.
 * In the web preview the connect button is disabled with a "desktop-only"
 * notice. Stories seed `useMalAuthStore`.
 */
const meta = {
  title: 'onboarding/steps/MalStep',
  component: MalStep,
  parameters: {
    layout: 'fullscreen',
    // The connect control is a named button and the benefit list is plain text —
    // axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useMalAuthStore.setState({ status: { connected: false }, loading: false, error: null });
  },
} satisfies Meta<typeof MalStep>;

export default meta;

type Story = StoryObj<typeof MalStep>;

/** Disconnected — connect CTA + benefit list. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('heading', { level: 2, name: /MyAnimeList/i })
    ).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Connect MyAnimeList' })).toBeInTheDocument();
    await expect(canvas.getByText('Import your MyAnimeList list')).toBeInTheDocument();
  },
};
