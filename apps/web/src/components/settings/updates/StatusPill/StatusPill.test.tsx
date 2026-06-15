import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { StatusPill } from './index';
import type { StatusTone } from './StatusPill.types';

describe('StatusPill', () => {
  it('renders the status text', () => {
    render(<StatusPill tone="green" text="Up to date" />);
    expect(screen.getByText('Up to date')).toBeInTheDocument();
  });

  it.each<[StatusTone, string]>([
    ['green', 'Up to date'],
    ['accent', 'Update available'],
    ['destructive', 'Update failed'],
    ['muted', 'Not checked'],
  ])('renders the %s tone label', (tone, text) => {
    render(<StatusPill tone={tone} text={text} />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });
});
