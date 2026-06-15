import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Timeline } from '@/components/shared/Timeline';
import type { TimelineEntry } from '@/components/shared/Timeline';

const entries: TimelineEntry[] = [
  { id: 'a', title: 'v1.0.0', timestamp: '2026-06', children: <span>Release notes A</span> },
  { id: 'b', title: 'v0.9.0', timestamp: '2026-05', children: <span>Release notes B</span> },
];

describe('Timeline', () => {
  it('renders one section per entry with its content, title and timestamp', () => {
    render(<Timeline entries={entries} />);
    expect(screen.getByText('Release notes A')).toBeInTheDocument();
    expect(screen.getByText('Release notes B')).toBeInTheDocument();
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('2026-06')).toBeInTheDocument();
  });

  it('preserves the order of entries as provided', () => {
    const { container } = render(<Timeline entries={entries} />);
    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(2);
    expect(sections[0].id).toBe('a');
    expect(sections[1].id).toBe('b');
  });

  it('uses each entry id as the section anchor id', () => {
    const { container } = render(<Timeline entries={entries} />);
    expect(container.querySelector('section#a')).toBeInTheDocument();
    expect(container.querySelector('section#b')).toBeInTheDocument();
  });

  it('renders nothing but the rail when given no entries', () => {
    const { container } = render(<Timeline entries={[]} />);
    expect(container.querySelectorAll('section')).toHaveLength(0);
    // The decorative vertical rail is still present.
    expect(container.querySelector('[aria-hidden]')).toBeInTheDocument();
  });

  it('renders a custom marker node when provided, overriding the default dot', () => {
    render(
      <Timeline
        entries={[
          {
            id: 'custom',
            marker: <span data-testid="custom-marker">★</span>,
            children: <span>entry</span>,
          },
        ]}
      />
    );
    expect(screen.getByTestId('custom-marker')).toBeInTheDocument();
  });

  it('renders entries without a title or timestamp without crashing', () => {
    render(<Timeline entries={[{ id: 'bare', children: <span>just content</span> }]} />);
    expect(screen.getByText('just content')).toBeInTheDocument();
  });

  it('marks the marker and rail as decorative (aria-hidden)', () => {
    const { container } = render(<Timeline entries={entries} />);
    // At least the rail + one marker per entry should be aria-hidden.
    expect(container.querySelectorAll('[aria-hidden]').length).toBeGreaterThanOrEqual(3);
  });

  it('forwards a custom className to the outer container', () => {
    const { container } = render(<Timeline entries={entries} className="my-timeline" />);
    expect(container.querySelector('.my-timeline')).toBeInTheDocument();
  });
});
