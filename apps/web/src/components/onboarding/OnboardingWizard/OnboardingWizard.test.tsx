import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import OnboardingWizard from './OnboardingWizard';

describe('OnboardingWizard', () => {
  it('renders as a labelled modal dialog with the first-step skip control', () => {
    render(<OnboardingWizard onComplete={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'First-run setup wizard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip setup' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('swaps skip for back once the user advances past the first step', async () => {
    const { user } = render(<OnboardingWizard onComplete={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip setup' })).not.toBeInTheDocument();
  });
});
