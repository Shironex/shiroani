import { describe, expect, it } from 'vitest';
import type { AnimeDetail } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import AnimeInfoPeople from './AnimeInfoPeople';

describe('AnimeInfoPeople', () => {
  it('renders a character name from the details', () => {
    const details = {
      characters: {
        edges: [
          {
            node: {
              id: 1,
              name: { full: 'Frieren', userPreferred: 'Frieren' },
              image: { medium: 'x.jpg' },
            },
            role: 'MAIN',
          },
        ],
      },
    } as unknown as AnimeDetail;

    render(<AnimeInfoPeople details={details} />);

    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });
});
