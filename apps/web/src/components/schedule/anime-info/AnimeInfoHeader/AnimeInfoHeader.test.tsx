import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AnimeInfoHeader from './AnimeInfoHeader';

describe('AnimeInfoHeader', () => {
  it('renders the title', () => {
    render(
      <AnimeInfoHeader
        title="Frieren"
        details={null}
        isSubscribed={false}
        onToggleSubscribe={vi.fn()}
      />
    );

    expect(screen.getByText('Frieren')).toBeInTheDocument();
  });
});
