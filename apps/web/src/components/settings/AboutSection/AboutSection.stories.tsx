import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAppStore } from '@/stores/useAppStore';
import AboutSection from './AboutSection';

/**
 * The About panel: an app hero with logo + version + CTA row (rerun onboarding,
 * open GitHub, open changelog) and a "story" card. The logs card only renders
 * inside Electron. Stories stub the store actions and `window.open` so the
 * external-link / navigation buttons are observable without side effects.
 */
const meta = {
  title: 'settings/AboutSection',
  component: AboutSection,
  parameters: {
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof AboutSection>;

export default meta;

type Story = StoryObj<typeof AboutSection>;

/** Renders the hero and story cards. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Story' })).toBeInTheDocument();
  },
};

/** Rerun-onboarding runs the onboarding store's reset action. */
export const RerunOnboarding: Story = {
  beforeEach: () => {
    useOnboardingStore.setState({ reset: fn() });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Rerun setup wizard' }));
    await waitFor(() => expect(useOnboardingStore.getState().reset).toHaveBeenCalledOnce());
  },
};

/** Opening the changelog navigates the app store to the changelog view. */
export const OpenChangelog: Story = {
  beforeEach: () => {
    useAppStore.setState({ navigateTo: fn() });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'View changelog' }));
    await waitFor(() =>
      expect(useAppStore.getState().navigateTo).toHaveBeenCalledWith('changelog')
    );
  },
};
