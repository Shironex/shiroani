import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import GenreBreakdown from './GenreBreakdown';

type Genres = UserProfile['statistics']['genres'];

describe('GenreBreakdown', () => {
  it('renders the top genres with percentages relative to the max', () => {
    render(
      <GenreBreakdown
        genres={
          [
            { name: 'Action', count: 100 },
            { name: 'Drama', count: 50 },
          ] as unknown as Genres
        }
      />
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders the empty hint when there are no genres', () => {
    render(<GenreBreakdown genres={[]} />);
    expect(screen.getByText('No genre data yet.')).toBeInTheDocument();
  });
});
