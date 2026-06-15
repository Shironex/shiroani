import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ComingSoonPlaceholder } from '@/components/shared/ComingSoonPlaceholder';

describe('ComingSoonPlaceholder', () => {
  it('renders the title, description and custom tag', () => {
    render(
      <ComingSoonPlaceholder title="Activity heatmap" description="Coming later." tag="SOON" />
    );
    expect(screen.getByText('Activity heatmap')).toBeInTheDocument();
    expect(screen.getByText('Coming later.')).toBeInTheDocument();
    expect(screen.getByText('SOON')).toBeInTheDocument();
  });
});
