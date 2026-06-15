import type { Meta, StoryObj } from '@storybook/react-vite';
import BackgroundPanel from './BackgroundPanel';

const meta = {
  title: 'shared/BackgroundPanel',
  component: BackgroundPanel,
} satisfies Meta<typeof BackgroundPanel>;

export default meta;

type Story = StoryObj<typeof BackgroundPanel>;

export const Card: Story = {
  args: { variant: 'card' },
};

export const Onboarding: Story = {
  args: { variant: 'onboarding' },
};
