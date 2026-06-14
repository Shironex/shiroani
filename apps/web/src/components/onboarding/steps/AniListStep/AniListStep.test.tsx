import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AniListStep from './AniListStep';

describe('AniListStep', () => {
  it('renders the AniList title and a connect action when disconnected', () => {
    render(<AniListStep />);

    expect(screen.getByRole('heading', { level: 2, name: /AniList/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
