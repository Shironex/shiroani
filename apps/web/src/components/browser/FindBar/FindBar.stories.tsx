import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import FindBar from './FindBar';

/**
 * In-page search bar (Ctrl+F): a `role="search"` region with a labelled input,
 * a live match-count readout (`aria-live`), and previous / next / close icon
 * buttons. It drives the active `<webview>`'s findInPage; the step buttons are
 * disabled until there are matches. With no active pane it is inert — ideal for
 * exercising the chrome without an Electron guest. Esc and the close button both
 * dismiss the bar.
 */
const meta = {
  title: 'browser/FindBar',
  component: FindBar,
  parameters: {
    // The input is labelled and every icon button is named, so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    activePaneId: {
      control: 'text',
      description: 'Pane id of the webview to search within, or null when inert.',
    },
    onClose: { description: 'Closes the bar and clears highlights.' },
  },
  args: {
    activePaneId: null,
    onClose: fn(),
  },
} satisfies Meta<typeof FindBar>;

export default meta;

type Story = StoryObj<typeof FindBar>;

/** Empty bar: the input autofocuses and the step buttons are disabled. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Find in page');
    await expect(input).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await userEvent.type(input, 'frieren');
    await expect(input).toHaveValue('frieren');
  },
};

/** The close button dismisses the bar. */
export const Close: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
