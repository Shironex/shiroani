import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import MalStep from './MalStep';

describe('MalStep', () => {
  it('renders the MyAnimeList title and a connect action when disconnected', () => {
    render(<MalStep />);

    expect(screen.getByRole('heading', { level: 2, name: /MyAnimeList/i })).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
