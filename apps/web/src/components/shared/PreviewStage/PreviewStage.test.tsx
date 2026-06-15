import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { PreviewStage } from '@/components/shared/PreviewStage';

describe('PreviewStage', () => {
  it('renders children and the optional label caption', () => {
    render(
      <PreviewStage label="PODGLĄD" data-testid="stage">
        <span>content</span>
      </PreviewStage>
    );
    expect(screen.getByTestId('stage')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.getByText('PODGLĄD')).toBeInTheDocument();
  });

  it('renders the bare stage (no caption) when no label is given', () => {
    render(
      <PreviewStage data-testid="stage">
        <span>content</span>
      </PreviewStage>
    );
    expect(screen.getByTestId('stage')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(screen.queryByText('PODGLĄD')).not.toBeInTheDocument();
  });

  it('applies the px height by default and omits it when heightClassName is set', () => {
    const { rerender } = render(
      <PreviewStage data-testid="stage" height={200}>
        <span>a</span>
      </PreviewStage>
    );
    expect(screen.getByTestId('stage')).toHaveStyle({ height: '200px' });

    rerender(
      <PreviewStage data-testid="stage" heightClassName="h-[220px]">
        <span>a</span>
      </PreviewStage>
    );
    // heightClassName takes precedence — no inline height is applied.
    expect(screen.getByTestId('stage').style.height).toBe('');
    expect(screen.getByTestId('stage')).toHaveClass('h-[220px]');
  });

  it('uses the rounded glass border for the default "full" treatment', () => {
    render(
      <PreviewStage data-testid="stage">
        <span>a</span>
      </PreviewStage>
    );
    expect(screen.getByTestId('stage')).toHaveClass('rounded-xl');
  });

  it('uses a bottom divider (no rounding) for the "bottom" border treatment', () => {
    render(
      <PreviewStage data-testid="stage" border="bottom">
        <span>a</span>
      </PreviewStage>
    );
    expect(screen.getByTestId('stage')).not.toHaveClass('rounded-xl');
    expect(screen.getByTestId('stage')).toHaveClass('border-b');
  });

  it('marks the decorative grid overlay as aria-hidden', () => {
    const { container } = render(
      <PreviewStage>
        <span>content</span>
      </PreviewStage>
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('forwards a custom className to the stage element', () => {
    render(
      <PreviewStage data-testid="stage" className="my-custom-class">
        <span>a</span>
      </PreviewStage>
    );
    expect(screen.getByTestId('stage')).toHaveClass('my-custom-class');
  });
});
