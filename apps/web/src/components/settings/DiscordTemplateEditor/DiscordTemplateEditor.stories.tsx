import type { Meta, StoryObj } from '@storybook/react-vite';
import { DEFAULT_DISCORD_TEMPLATES } from '@shiroani/shared';
import DiscordTemplateEditor from './DiscordTemplateEditor';

const meta = {
  title: 'settings/DiscordTemplateEditor',
  component: DiscordTemplateEditor,
} satisfies Meta<typeof DiscordTemplateEditor>;

export default meta;

type Story = StoryObj<typeof DiscordTemplateEditor>;

export const Default: Story = {
  args: {
    selectedActivity: 'watching',
    currentTemplate: DEFAULT_DISCORD_TEMPLATES.watching,
    onActivityChange: () => {},
    onTemplateChange: () => {},
    onReset: () => {},
  },
};
