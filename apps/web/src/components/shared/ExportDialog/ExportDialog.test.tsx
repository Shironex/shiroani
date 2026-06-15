import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';

// The export flow emits over the socket; stub it so the dialog parks on its
// loading state instead of touching the real transport.
vi.mock('@/lib/socket', () => ({
  emitWithErrorHandling: vi.fn(() => new Promise(() => {})),
}));

import { ExportDialog } from '@/components/shared/ExportDialog';

describe('ExportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dialog title when open', () => {
    render(<ExportDialog open onOpenChange={() => {}} type="library" />);
    expect(screen.getByText('Export data')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ExportDialog open={false} onOpenChange={() => {}} type="library" />);
    expect(screen.queryByText('Export data')).not.toBeInTheDocument();
  });
});
