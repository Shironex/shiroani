import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useSupportBannerStore } from '@/stores/useSupportBannerStore';
import { SupportBanner } from '@/components/shared/SupportBanner';

describe('SupportBanner', () => {
  beforeEach(() => {
    useSupportBannerStore.setState({ seen: false });
  });

  it('renders the support banner when not yet seen', () => {
    render(<SupportBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders nothing once dismissed', () => {
    useSupportBannerStore.setState({ seen: true });
    const { container } = render(<SupportBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
