import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { PreviewStage } from '@/components/shared/PreviewStage';

describe('PreviewStage', () => {
  it('renders children and an optional label', () => {
    render(
      <PreviewStage label="PODGLĄD" data-testid="stage">
        <span>content</span>
      </PreviewStage>
    );
    expect(screen.getByTestId('stage')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByText('PODGLĄD')).toBeInTheDocument();
  });
});
