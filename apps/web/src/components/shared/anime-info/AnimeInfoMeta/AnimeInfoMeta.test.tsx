import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AnimeInfoMeta from './AnimeInfoMeta';

describe('AnimeInfoMeta', () => {
  it('renders studios and genre badges', () => {
    render(
      <AnimeInfoMeta
        details={null}
        mainStudios={['Madhouse']}
        genres={['Action']}
        nonSpoilerTags={[]}
        loading={false}
        descExpanded={false}
        onToggleDesc={vi.fn()}
        language="en"
      />
    );

    expect(screen.getByText('Madhouse')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});
