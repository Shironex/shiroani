import { describe, expect, it } from 'vitest';
import { Rocket } from 'lucide-react';
import { render, screen } from '@/test/test-utils';
import { ComingSoonPlaceholder } from '@/components/shared/ComingSoonPlaceholder';

describe('ComingSoonPlaceholder', () => {
  it('renders the title, description and custom tag', () => {
    render(
      <ComingSoonPlaceholder title="Activity heatmap" description="Coming later." tag="SOON" />
    );
    expect(screen.getByRole('heading', { name: 'Activity heatmap' })).toBeInTheDocument();
    expect(screen.getByText('Coming later.')).toBeInTheDocument();
    expect(screen.getByText('SOON')).toBeInTheDocument();
  });

  it('falls back to the localized default tag when none is provided', () => {
    render(<ComingSoonPlaceholder title="Activity heatmap" />);
    // EN default for nav:comingSoon.tag.
    expect(screen.getByText('SOON')).toBeInTheDocument();
  });

  it('omits the description paragraph when none is provided', () => {
    render(<ComingSoonPlaceholder title="Activity heatmap" />);
    expect(screen.getByRole('heading', { name: 'Activity heatmap' })).toBeInTheDocument();
    expect(screen.queryByText('Coming later.')).not.toBeInTheDocument();
  });

  it('forwards arbitrary HTML attributes and className to the root element', () => {
    const { container } = render(
      <ComingSoonPlaceholder
        title="Activity heatmap"
        className="my-custom-class"
        data-testid="cs"
      />
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('my-custom-class');
    expect(root).toHaveAttribute('data-testid', 'cs');
  });

  it('renders a custom icon as decorative', () => {
    const { container } = render(<ComingSoonPlaceholder icon={Rocket} title="Activity heatmap" />);
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });
});
