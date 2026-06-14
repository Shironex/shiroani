import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ThemeStep from './ThemeStep';

describe('ThemeStep', () => {
  it('renders the dark and light theme groups', () => {
    render(<ThemeStep />);

    expect(screen.getByRole('heading', { name: 'Themes' })).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('Light')).toBeInTheDocument();
  });
});
