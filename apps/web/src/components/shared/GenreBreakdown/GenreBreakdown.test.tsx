import { describe, expect, it } from 'vitest';
import type { UserProfile } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import GenreBreakdown from './GenreBreakdown';

type Genres = UserProfile['statistics']['genres'];

const genres = (...rows: Array<{ name: string; count: number }>) => rows as unknown as Genres;

describe('GenreBreakdown', () => {
  it('renders the top genres with percentages relative to the max', () => {
    render(
      <GenreBreakdown
        genres={genres({ name: 'Action', count: 100 }, { name: 'Drama', count: 50 })}
      />
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('caps the number of rows at the limit', () => {
    render(
      <GenreBreakdown
        limit={2}
        genres={genres(
          { name: 'Action', count: 100 },
          { name: 'Drama', count: 80 },
          { name: 'Comedy', count: 60 }
        )}
      />
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.queryByText('Comedy')).not.toBeInTheDocument();
  });

  it('renders the empty hint when there are no genres', () => {
    render(<GenreBreakdown genres={[]} />);
    expect(screen.getByText('No genre data yet.')).toBeInTheDocument();
  });
});
