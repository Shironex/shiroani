import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import OnboardingWizard from './OnboardingWizard';

/**
 * First-run setup wizard — a full-window (`fixed inset-0`) modal dialog that
 * walks the user through ten slots (language → … → summary) with a chip deck,
 * animated transitions, a back/skip control, clickable progress dots and a
 * Next/finish CTA. Each step reads its own Zustand store at default
 * (disconnected) state, so the whole flow renders without a backend; the
 * optional account steps degrade to a "desktop-only" notice in the browser.
 *
 * Stories reset `useOnboardingStore` in `beforeEach` so the finish CTA flips a
 * real, observable completion flag.
 */
const meta = {
  title: 'onboarding/OnboardingWizard',
  component: OnboardingWizard,
  parameters: {
    layout: 'fullscreen',
    // Dialog is labelled, every nav control is a named button, the progress
    // dots form a labelled group with aria-current — axe passes clean.
    a11y: { test: 'error' },
  },
  args: { onComplete: fn() },
  argTypes: {
    onComplete: {
      description:
        'Called once the user finishes (or skips) onboarding, after the exit animation; the parent typically unmounts the wizard here.',
    },
  },
  beforeEach: () => {
    useOnboardingStore.setState({ completed: false });
  },
} satisfies Meta<typeof OnboardingWizard>;

export default meta;

type Story = StoryObj<typeof OnboardingWizard>;

/** Opens on the language step with Skip + Next and the ten-dot progress rail. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('dialog', { name: 'First-run setup wizard' })
    ).toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Interface language' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Skip setup' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  },
};

/** Driving Next advances to the name step and swaps Skip for Back. */
export const AdvancesToNextStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));

    await expect(canvas.getByRole('heading', { name: 'Your name' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    // Back returns to the language step.
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }));
    await expect(canvas.getByRole('heading', { name: 'Interface language' })).toBeInTheDocument();
  },
};

/**
 * Finishing from the summary slot marks onboarding complete and fires
 * `onComplete` after the exit animation.
 */
export const FinishesOnboarding: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    // Jump straight to the summary slot via its progress dot.
    await userEvent.click(canvas.getByRole('button', { name: 'Step 10: summary' }));
    await expect(canvas.getByRole('heading', { name: 'All ready!' })).toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Open library' }));
    await waitFor(() => expect(args.onComplete).toHaveBeenCalledTimes(1));
    await expect(useOnboardingStore.getState().completed).toBe(true);
  },
};
