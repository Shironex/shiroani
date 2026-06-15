import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import OnboardingWizard from './OnboardingWizard';

beforeEach(() => {
  // Start each test from "not yet completed" so finish() flips a real flag.
  useOnboardingStore.setState({ completed: false });
});

describe('OnboardingWizard', () => {
  it('renders as a labelled modal dialog with the first-step skip control', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'First-run setup wizard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip setup' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    // First slot is the language step.
    expect(screen.getByRole('heading', { name: 'Interface language' })).toBeInTheDocument();
  });

  it('swaps skip for back and advances to the next step on Next', async () => {
    const { user } = render(<OnboardingWizard onComplete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
    // Second slot is the name step.
    expect(screen.getByRole('heading', { name: 'Your name' })).toBeInTheDocument();
  });

  it('returns to the previous step when Back is pressed', async () => {
    const { user } = render(<OnboardingWizard onComplete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('heading', { name: 'Your name' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Interface language' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip setup' })).toBeInTheDocument();
  });

  it('jumps directly to a step via the progress dots', async () => {
    const { user } = render(<OnboardingWizard onComplete={vi.fn()} />);

    // Dot 3 (index 2) is the theme step.
    await user.click(screen.getByRole('button', { name: 'Step 3: theme' }));

    expect(screen.getByRole('heading', { name: 'Themes' })).toBeInTheDocument();
    // The current dot exposes aria-current="step".
    expect(screen.getByRole('button', { name: 'Step 3: theme' })).toHaveAttribute(
      'aria-current',
      'step'
    );
  });

  it('shows the finish CTA only on the last (summary) slot', async () => {
    const { user } = render(<OnboardingWizard onComplete={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Open library' })).not.toBeInTheDocument();

    // Last dot (index 9) is the summary slot.
    await user.click(screen.getByRole('button', { name: 'Step 10: summary' }));

    expect(screen.getByRole('heading', { name: 'All ready!' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open library' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('completes onboarding and invokes onComplete when finishing', async () => {
    const onComplete = vi.fn();
    const { user } = render(<OnboardingWizard onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: 'Step 10: summary' }));
    await user.click(screen.getByRole('button', { name: 'Open library' }));

    // finish() marks the store complete and fires onComplete behind a 500ms
    // exit-animation timeout (real timer), so await both effects.
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('skips straight to completion from the first step', async () => {
    const onComplete = vi.fn();
    const { user } = render(<OnboardingWizard onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: 'Skip setup' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(useOnboardingStore.getState().completed).toBe(true);
  });

  it('navigates with the keyboard: arrows step, Escape jumps to the summary', async () => {
    const { user } = render(<OnboardingWizard onComplete={vi.fn()} />);

    // Language slot has no autofocusing field, so the keydown handler isn't
    // suppressed by isEditableTarget.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('heading', { name: 'Your name' })).toBeInTheDocument();

    // NameStep autofocuses its input; blur it so the back-arrow isn't swallowed
    // by the "don't hijack keys while typing" guard.
    (document.activeElement as HTMLElement | null)?.blur();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('heading', { name: 'Interface language' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'All ready!' })).toBeInTheDocument()
    );
  });
});
