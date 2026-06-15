import type { Meta, StoryObj } from '@storybook/react-vite';
import DiscordSection from './DiscordSection';

const meta = {
  title: 'settings/DiscordSection',
  component: DiscordSection,
} satisfies Meta<typeof DiscordSection>;

export default meta;

type Story = StoryObj<typeof DiscordSection>;

/**
 * Without electronAPI (Storybook), the section hydrates no settings and
 * renders nothing. Store-backed states are exercised in the app at runtime.
 */
export const Default: Story = {};
