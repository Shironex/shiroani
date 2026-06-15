import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import StudioBreakdown from './StudioBreakdown';

type Studios = UserProfile['statistics']['studios'];

const studios = (...rows: Array<{ name: string; count: number }>) => rows as unknown as Studios;

describe('StudioBreakdown', () => {
  it('renders the top studios with their counts', () => {
    render(
      <StudioBreakdown
        studios={studios({ name: 'MAPPA', count: 32 }, { name: 'Bones', count: 12 })}
      />
    );
    expect(screen.getByText('MAPPA')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('Bones')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('caps the number of rows at the limit', () => {
    render(
      <StudioBreakdown
        limit={2}
        studios={studios(
          { name: 'MAPPA', count: 32 },
          { name: 'Wit Studio', count: 18 },
          { name: 'Bones', count: 12 }
        )}
      />
    );
    expect(screen.getByText('MAPPA')).toBeInTheDocument();
    expect(screen.getByText('Wit Studio')).toBeInTheDocument();
    expect(screen.queryByText('Bones')).not.toBeInTheDocument();
  });

  it('renders the empty hint when there are no studios', () => {
    render(<StudioBreakdown studios={[]} />);
    expect(screen.getByText('No studio data yet.')).toBeInTheDocument();
  });
});
