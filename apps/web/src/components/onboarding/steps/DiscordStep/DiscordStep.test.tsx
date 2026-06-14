import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DiscordStep from './DiscordStep';

describe('DiscordStep', () => {
  it('renders the Rich Presence title and toggle', () => {
    render(<DiscordStep />);

    expect(screen.getByRole('heading', { name: 'Rich Presence' })).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});
