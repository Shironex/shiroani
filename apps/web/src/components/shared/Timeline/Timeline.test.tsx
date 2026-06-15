import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Timeline } from '@/components/shared/Timeline';

describe('Timeline', () => {
  it('renders one section per entry with content', () => {
    render(
      <Timeline
        entries={[
          { id: 'a', title: 'v1.0.0', children: <span>Release notes A</span> },
          { id: 'b', title: 'v0.9.0', children: <span>Release notes B</span> },
        ]}
      />
    );
    expect(screen.getByText('Release notes A')).toBeInTheDocument();
    expect(screen.getByText('Release notes B')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });
});
