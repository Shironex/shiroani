import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { DevLogsDialog } from './index';

describe('DevLogsDialog', () => {
  it('renders the dialog title when open', () => {
    render(<DevLogsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText('Log viewer')).toBeInTheDocument();
  });
});
