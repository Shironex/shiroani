import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ImportDialog } from '@/components/shared/ImportDialog';

describe('ImportDialog', () => {
  it('renders the dialog title when open', () => {
    render(<ImportDialog open onOpenChange={() => {}} type="all" />);
    expect(screen.getByText('Import data')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(<ImportDialog open={false} onOpenChange={() => {}} type="all" />);
    expect(screen.queryByText('Import data')).not.toBeInTheDocument();
  });
});
