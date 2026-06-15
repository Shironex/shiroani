import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import SplashFooter from './SplashFooter';

const onRetry = fn();
const onClose = fn();

/**
 * Bottom status strip of the splash overlay. The loading/updating variants show
 * a blinking tone dot, a status line (rotating prose `message`, or the
 * structured `statusText` action · target when supplied), an optional
 * indeterminate/determinate progress bar, and a right-side meta label
 * (`metaRight`, else `v{version}`). The error variant replaces all of that with
 * centered Close + Retry buttons. The whole strip is a polite `role="status"`
 * live region and fades in once `showSpinner` flips true.
 */
const meta = {
  title: 'splash/SplashFooter',
  component: SplashFooter,
  parameters: {
    // Close/Retry are named <button>s, the progress bar carries an aria-label,
    // and the tone dot is aria-hidden decoration, so axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['loading', 'updating', 'error'],
      description: 'Drives tone, progress visibility, and the loading/error layout switch.',
    },
    showSpinner: {
      control: 'boolean',
      description: 'Fades the strip in once the splash has been visible briefly.',
    },
    statusText: {
      description: 'Structured `action · target` row; preferred over the rotating `message` prose.',
    },
    progressValue: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Determinate 0–100 progress; indeterminate when null/undefined.',
    },
    metaRight: {
      control: 'text',
      description: 'Right-side meta label; falls back to `v{version}` when omitted.',
    },
    onRetry: { description: 'Fired by the error-state Retry button.' },
    onClose: { description: 'Fired by the error-state Close button.' },
  },
  args: {
    showSpinner: true,
    message: 'Shiro-chan is stretching~ nyaa...',
    messageKey: 0,
    progressValue: null,
    version: '0.5.2',
    metaRight: null,
    error: null,
    onRetry,
    onClose,
  },
} satisfies Meta<typeof SplashFooter>;

export default meta;

type Story = StoryObj<typeof SplashFooter>;

/** Loading — rotating prose, indeterminate primary progress, `v{version}` meta. */
export const Loading: Story = { args: { variant: 'loading' } };

/** Updating — structured status row, info tone, "restarting..." meta. */
export const Updating: Story = {
  args: {
    variant: 'updating',
    statusText: { action: 'Installing', target: 'v0.6.0' },
    metaRight: 'restarting...',
  },
};

/** Error — centered Close + Retry buttons; clicking each fires its callback. */
export const Error: Story = {
  args: { variant: 'error', error: 'network unreachable' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    onClose.mockClear();
    onRetry.mockClear();
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }));
    await expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole('button', { name: 'Retry' }));
    await expect(onRetry).toHaveBeenCalledTimes(1);
  },
};
