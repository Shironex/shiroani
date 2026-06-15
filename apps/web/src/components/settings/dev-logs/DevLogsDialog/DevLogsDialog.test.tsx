import { describe, expect, it } from 'vitest';
import { clearLogBuffer } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { DevLogsDialog } from './index';

describe('DevLogsDialog', () => {
  it('renders the dialog title when open', () => {
    render(<DevLogsDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Log viewer' })).toBeInTheDocument();
  });

  it('renders the toolbar inside the dialog', () => {
    render(<DevLogsDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('shows the empty-buffer state when there are no entries', () => {
    // The unit setup mocks `createLogger` to a silent logger, so the real ring
    // buffer stays empty; clearing keeps the state deterministic.
    clearLogBuffer();
    render(<DevLogsDialog open onOpenChange={() => {}} />);
    expect(screen.getByText('Buffer is empty.')).toBeInTheDocument();
  });

  it('is not in the document when closed', () => {
    render(<DevLogsDialog open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
