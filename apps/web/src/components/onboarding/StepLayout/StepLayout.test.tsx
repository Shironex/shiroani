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
        stepHint="Change it later in Settings."
      >
        <div>Form body</div>
      </StepLayout>
    );

    expect(screen.getByRole('heading', { name: 'Make ShiroAni yours' })).toBeInTheDocument();
    expect(screen.getByText('Step 01 · Setup')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Get started' })).toBeInTheDocument();
    expect(screen.getByText('Change it later in Settings.')).toBeInTheDocument();
    expect(screen.getByText('Form body')).toBeInTheDocument();
  });
});
