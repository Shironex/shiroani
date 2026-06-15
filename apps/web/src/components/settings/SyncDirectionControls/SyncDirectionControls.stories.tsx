import type { Meta, StoryObj } from '@storybook/react-vite';
import { SyncModeSelector, PushLibraryButton } from './';

const meta = {
  title: 'settings/SyncDirectionControls',
  component: SyncModeSelector,
} satisfies Meta<typeof SyncModeSelector>;

export default meta;

type Story = StoryObj<typeof SyncModeSelector>;

export const ModeSelector: Story = {
  args: { provider: 'anilist', value: 'two-way', onChange: () => {} },
};

export const PushButton: StoryObj<typeof PushLibraryButton> = {
  render: () => <PushLibraryButton provider="anilist" onPush={() => {}} />,
};
