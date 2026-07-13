import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Eyebrow } from '@/components/shared/Eyebrow';

describe('Eyebrow', () => {
  it('renders a span when htmlFor is omitted', () => {
    render(<Eyebrow>Sekcja</Eyebrow>);
    const el = screen.getByText('Sekcja');
    expect(el.tagName).toBe('SPAN');
  });

  it('renders a label bound to a field when htmlFor is provided', () => {
    render(
      <>
        <Eyebrow htmlFor="field-id">Nazwa</Eyebrow>
        <input id="field-id" />
      </>
    );
    const el = screen.getByText('Nazwa');
    expect(el.tagName).toBe('LABEL');
    expect(screen.getByLabelText('Nazwa')).toBeInTheDocument();
  });

  it('merges custom className with the base classes', () => {
    render(<Eyebrow className="text-primary">Etykieta</Eyebrow>);
    const el = screen.getByText('Etykieta');
    expect(el).toHaveClass('font-mono');
    expect(el).toHaveClass('text-primary');
  });
});
