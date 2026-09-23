import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AnimeInfoLinks from './AnimeInfoLinks';

describe('AnimeInfoLinks', () => {
  it('renders a streaming platform link by its raw site name', () => {
    render(
      <AnimeInfoLinks
        details={null}
        streamingLinks={[{ url: 'https://x', site: 'Crunchyroll', type: 'STREAMING' }]}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText('Crunchyroll')).toBeInTheDocument();
  });
});
