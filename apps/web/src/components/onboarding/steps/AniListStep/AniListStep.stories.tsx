import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect } from 'storybook/test';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import AniListStep from './AniListStep';

/**
 * Onboarding step 08 · AniList account (optional). Connects AniList so the
 * library and profile sync; the token is held main-side and never crosses IPC,
 * so this only ever reads an auth status. Entirely optional — nothing here gates
 * the wizard. In the web preview the connect button is disabled with a
 * "desktop-only" notice. Stories seed `useAniListAuthStore`.
 */
const meta = {
  title: 'onboarding/steps/AniListStep',
  component: AniListStep,
  parameters: {
    layout: 'fullscreen',
    // The connect control is a named button and the benefit list is plain text —
    // axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useAniListAuthStore.setState({ status: { connected: false }, loading: false, error: null });
  },
} satisfies Meta<typeof AniListStep>;

export default meta;

type Story = StoryObj<typeof AniListStep>;

/** Disconnected — connect CTA + benefit list. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2, name: /AniList/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Connect AniList' })).toBeInTheDocument();
    await expect(canvas.getByText('Import your AniList list')).toBeInTheDocument();
  },
};
