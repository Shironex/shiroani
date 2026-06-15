import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useConnectionStore } from '@/stores/useConnectionStore';
import { ConnectionBanner } from '@/components/shared/ConnectionBanner';

describe('ConnectionBanner', () => {
  beforeEach(() => {
    useConnectionStore.setState({ status: 'connected' });
  });

  it('renders nothing while connected', () => {
    const { container } = render(<ConnectionBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the reconnecting message and no retry button while reconnecting', () => {
    useConnectionStore.setState({ status: 'reconnecting' });
    render(<ConnectionBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Reconnecting…')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the offline message and a retry button when the connection failed', () => {
    useConnectionStore.setState({ status: 'failed' });
    render(<ConnectionBanner />);
    expect(screen.getByText('No connection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('fires retryConnection when the retry button is clicked', async () => {
    const retryConnection = vi.fn();
    useConnectionStore.setState({ status: 'failed', retryConnection });
    const { user } = render(<ConnectionBanner />);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retryConnection).toHaveBeenCalledTimes(1);
  });

  it('exposes a polite live region so status changes are announced', () => {
    useConnectionStore.setState({ status: 'failed' });
    render(<ConnectionBanner />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
