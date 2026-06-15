import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useProfileStore } from '@/stores/useProfileStore';
import ProfileSetup from './ProfileSetup';

/**
 * AniList connect form shown when no username is stored — a centered card with a
 * username input and a submit button that stays disabled until a non-blank value
 * is typed. Submitting calls `useProfileStore.setUsername`, which (with a value)
 * kicks off the profile fetch; stories stub it so no socket call runs.
 */
const meta = {
  title: 'profile/ProfileSetup',
  component: ProfileSetup,
  parameters: {
    layout: 'fullscreen',
    // Labelled input + named submit button — axe clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    // Stub setUsername so a submit never triggers the (socket-backed) fetch.
    useProfileStore.setState({
      username: '',
      isLoading: false,
      error: null,
      setUsername: fn(),
    });
  },
} satisfies Meta<typeof ProfileSetup>;

export default meta;

type Story = StoryObj<typeof ProfileSetup>;

/** Empty form — the submit button is disabled until a username is typed. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Connect your AniList profile')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Connect' })).toBeDisabled();
  },
};

/** Typing a username enables submit; submitting calls setUsername with the value. */
export const SubmitUsername: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    await userEvent.type(input, 'Yor');
    const submit = canvas.getByRole('button', { name: 'Connect' });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await waitFor(() => expect(useProfileStore.getState().setUsername).toHaveBeenCalledWith('Yor'));
  },
};

/** A fetch failure surfaces the error message under the form. */
export const WithError: Story = {
  beforeEach: () => {
    useProfileStore.setState({
      username: '',
      isLoading: false,
      error: 'AniList user not found',
      setUsername: fn(),
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('AniList user not found')).toBeInTheDocument();
  },
};
