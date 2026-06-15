import type { Meta, StoryObj } from '@storybook/react-vite';
import AccountsSection from './AccountsSection';

const meta = {
  title: 'settings/AccountsSection',
  component: AccountsSection,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof AccountsSection>;

export default meta;

type Story = StoryObj<typeof AccountsSection>;

/**
 * Default mount. With no `window.electronAPI` bridge present (Storybook), both
 * the AniList and MyAnimeList cards render in their disconnected state.
 */
export const Default: Story = {};
