import type { Meta, StoryObj } from '@storybook/react-vite';
import ChangelogView from './ChangelogView';

const meta = {
  title: 'changelog/ChangelogView',
  component: ChangelogView,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChangelogView>;

export default meta;

type Story = StoryObj<typeof ChangelogView>;

// Release data comes from the shared @shiroani/changelog package, so both
// stories render the real timeline with no backend or store seeding.
export const Default: Story = {};

export const Compact: Story = { args: { compact: true } };
