import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SuiteSection from './SuiteSection';

describe('SuiteSection', () => {
  it('renders the suite card title', () => {
    render(<SuiteSection />);
    expect(screen.getByText('App family')).toBeInTheDocument();
  });

  it('renders a card for each sibling app', () => {
    render(<SuiteSection />);
    expect(screen.getByText('Shiranami')).toBeInTheDocument();
    expect(screen.getByText('KireiManga')).toBeInTheDocument();
  });
});
