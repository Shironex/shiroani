import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import DockStep from './DockStep';

describe('DockStep', () => {
  it('renders the dock title and the three preference toggles', () => {
    render(<DockStep />);

    expect(screen.getByRole('heading', { name: 'Dock' })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(3);
  });
});
