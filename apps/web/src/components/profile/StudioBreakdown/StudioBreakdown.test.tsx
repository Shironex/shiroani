import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import StudioBreakdown from './StudioBreakdown';

type Studios = UserProfile['statistics']['studios'];

describe('StudioBreakdown', () => {
  it('renders the top studios with their counts', () => {
    render(
      <StudioBreakdown
        studios={
          [
            { name: 'MAPPA', count: 32 },
            { name: 'Bones', count: 12 },
          ] as unknown as Studios
        }
      />
    );
    expect(screen.getByText('MAPPA')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
  });

  it('renders the empty hint when there are no studios', () => {
    render(<StudioBreakdown studios={[]} />);
    expect(screen.getByText('No studio data yet.')).toBeInTheDocument();
  });
});
