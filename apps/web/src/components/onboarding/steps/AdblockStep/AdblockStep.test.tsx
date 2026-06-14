import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AdblockStep from './AdblockStep';

describe('AdblockStep', () => {
  it('renders the ad-blocking title and its single toggle', () => {
    render(<AdblockStep />);

    expect(screen.getByRole('heading', { name: 'Ad blocking' })).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });
});
