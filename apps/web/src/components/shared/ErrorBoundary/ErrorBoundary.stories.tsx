import type { Meta, StoryObj } from '@storybook/react-vite';
import ErrorBoundary from './ErrorBoundary';

function Boom(): never {
  throw new Error('Storybook-triggered render error');
}

const meta = {
  title: 'shared/ErrorBoundary',
  component: ErrorBoundary,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;

type Story = StoryObj<typeof ErrorBoundary>;

export const Healthy: Story = {
  args: { children: <div className="p-8">Everything is fine.</div> },
};

export const Crashed: Story = {
  args: { children: <Boom /> },
};
