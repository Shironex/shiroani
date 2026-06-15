import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { StatusPill } from './index';

describe('StatusPill', () => {
  it('renders the status text', () => {
    render(<StatusPill tone="green" text="Up to date" />);
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });
});
