import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ViewsSection from './ViewsSection';

describe('ViewsSection', () => {
  it('renders the view visibility card title', () => {
    render(<ViewsSection />);
    expect(screen.getByText('View visibility')).toBeInTheDocument();
  });
});
