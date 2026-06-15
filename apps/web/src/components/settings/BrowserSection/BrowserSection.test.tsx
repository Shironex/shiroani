import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import BrowserSection from './BrowserSection';

describe('BrowserSection', () => {
  it('renders the ad-blocking card title', () => {
    render(<BrowserSection />);
    expect(screen.getByText('Ad blocking')).toBeInTheDocument();
  });
});
