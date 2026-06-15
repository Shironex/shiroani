import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SupportSection from './SupportSection';

describe('SupportSection', () => {
  it('renders the support card title', () => {
    render(<SupportSection />);
    expect(screen.getByText('Support ShiroAni')).toBeInTheDocument();
  });
});
