import type { Meta, StoryObj } from '@storybook/react-vite';
import SplashFooter from './SplashFooter';

const meta = {
  title: 'splash/SplashFooter',
  component: SplashFooter,
  args: {
    showSpinner: true,
    message: 'Shiro-chan is stretching~ nyaa...',
    messageKey: 0,
    progressValue: null,
    version: '0.5.2',
    metaRight: null,
    error: null,
    onRetry: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof SplashFooter>;

export default meta;

type Story = StoryObj<typeof SplashFooter>;

export const Loading: Story = { args: { variant: 'loading' } };

export const Updating: Story = {
  args: {
    variant: 'updating',
    statusText: { action: 'Installing', target: 'v0.6.0' },
    metaRight: 'restarting...',
  },
};

export const Error: Story = {
  args: { variant: 'error', error: 'network unreachable' },
};
