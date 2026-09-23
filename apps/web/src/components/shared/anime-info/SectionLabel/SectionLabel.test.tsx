import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SectionLabel from './SectionLabel';

describe('SectionLabel', () => {
  it('renders its children as a heading with the default spacing', () => {
    render(<SectionLabel>Genres</SectionLabel>);

    const heading = screen.getByRole('heading', { name: 'Genres' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('mb-1.5');
  });

  it('merges a spacing override over the default margin', () => {
    render(<SectionLabel className="mb-2">Staff</SectionLabel>);

    const heading = screen.getByRole('heading', { name: 'Staff' });
    expect(heading).toHaveClass('mb-2');
    expect(heading).not.toHaveClass('mb-1.5');
  });
});
