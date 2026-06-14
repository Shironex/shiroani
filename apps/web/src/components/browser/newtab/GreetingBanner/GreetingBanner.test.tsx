import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import GreetingBanner from './GreetingBanner';

describe('GreetingBanner', () => {
  it('renders a time-aware greeting heading', () => {
    render(<GreetingBanner showName={false} />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
