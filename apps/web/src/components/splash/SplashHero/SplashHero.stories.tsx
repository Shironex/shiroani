import type { Meta, StoryObj } from '@storybook/react-vite';
import SplashHero from './SplashHero';

const meta = {
  title: 'splash/SplashHero',
  component: SplashHero,
} satisfies Meta<typeof SplashHero>;

export default meta;

type Story = StoryObj<typeof SplashHero>;

export const Loading: Story = { args: { variant: 'loading' } };

export const Updating: Story = {
  args: { variant: 'updating', updatingTarget: 'v0.6.0' },
};

export const Error: Story = {
  args: { variant: 'error', errorMessage: 'network unreachable' },
};
