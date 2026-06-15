import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import StepLayout from './StepLayout';

describe('StepLayout', () => {
  it('renders the headline, step marker, title, hint, and body', () => {
    render(
      <StepLayout
        kanji="設定"
        headline="Make ShiroAni yours"
        description="A quick tour."
        stepMarker="Step 01 · Setup"
        stepTitle="Get started"
        stepIcon={<span data-testid="step-icon">★</span>}
        stepHint="Change it later in Settings."
      >
        <div>Form body</div>
      </StepLayout>
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Make ShiroAni yours' })
    ).toBeInTheDocument();
    expect(screen.getByText('Step 01 · Setup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Get started/ })).toBeInTheDocument();
    expect(screen.getByTestId('step-icon')).toBeInTheDocument();
    expect(screen.getByText('Change it later in Settings.')).toBeInTheDocument();
    expect(screen.getByText('Form body')).toBeInTheDocument();
  });

  it('omits the icon and hint when not provided', () => {
    render(
      <StepLayout
        kanji="名"
        headline="Headline only"
        description="Body."
        stepMarker="Marker"
        stepTitle="Title"
      >
        <div>Body card</div>
      </StepLayout>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(screen.queryByText('Change it later in Settings.')).not.toBeInTheDocument();
    expect(screen.getByText('Body card')).toBeInTheDocument();
  });
});
