import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import SplashScreen from './SplashScreen';

const meta = {
  title: 'splash/SplashScreen',
  component: SplashScreen,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
  args: {
    ready: false,
    error: null,
  },
} satisfies Meta<typeof SplashScreen>;

export default meta;

type Story = StoryObj<typeof SplashScreen>;

export const Loading: Story = {};

export const Error: Story = {
  args: { error: 'network unreachable' },
};
