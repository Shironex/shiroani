import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import SettingsView from './SettingsView';

const meta = {
  title: 'settings/SettingsView',
  component: SettingsView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof SettingsView>;

export default meta;

type Story = StoryObj<typeof SettingsView>;

export const Default: Story = {};
