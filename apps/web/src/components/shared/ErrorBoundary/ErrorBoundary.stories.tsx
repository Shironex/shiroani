import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect } from 'storybook/test';
import ErrorBoundary from './ErrorBoundary';

/**
 * Class-based React error boundary. Renders its children normally and, when a
 * descendant throws during render, swaps to a branded recovery fallback (mascot,
 * "something went wrong" kicker, a collapsible technical-details disclosure, and
 * "Restart app" / "Try again" buttons). Changing any value in `resetKeys` after
 * an error clears the boundary automatically. The `Crashed` story intentionally
 * throws so the fallback renders — the boundary catches it, so the story passes.
 */
const meta = {
  title: 'shared/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'fullscreen',
    a11y: { test: 'error' },
  },
  argTypes: {
    children: {
      description: 'Subtree to render and guard. Any render-time throw triggers the fallback.',
    },
    resetKeys: {
      description:
        'Values that, when changed after an error, auto-clear the boundary (e.g. [activeView]).',
    },
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;

type Story = StoryObj<typeof ErrorBoundary>;

function Boom(): never {
  throw new Error('Storybook-triggered render error');
}

export const Healthy: Story = {
  args: { children: <div className="p-8">Everything is fine.</div> },
};

export const Crashed: Story = {
  args: { children: <Boom /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The boundary caught the throw and rendered the recovery fallback.
    await expect(canvas.getByText('something went wrong')).toBeInTheDocument();
    const retry = canvas.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeInTheDocument();
    // Clicking retry resets the boundary; the child throws again and the
    // fallback re-renders (still caught — never an uncaught story error).
    await userEvent.click(retry);
    await expect(canvas.getByText('something went wrong')).toBeInTheDocument();
  },
};
