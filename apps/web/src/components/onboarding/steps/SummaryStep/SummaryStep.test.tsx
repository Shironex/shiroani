import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SummaryStep from './SummaryStep';

describe('SummaryStep', () => {
  it('renders the summary title and the reflected setting rows', () => {
    render(<SummaryStep />);

    expect(screen.getByRole('heading', { name: 'All ready!' })).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Adblock')).toBeInTheDocument();
  });
});
