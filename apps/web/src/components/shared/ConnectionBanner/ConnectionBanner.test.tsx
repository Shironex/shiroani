import { describe, expect, it, beforeEach } from 'vitest';
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

  it('renders a status banner while reconnecting', () => {
    useConnectionStore.setState({ status: 'reconnecting' });
    render(<ConnectionBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
