import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import BackgroundStep from './BackgroundStep';

describe('BackgroundStep', () => {
  it('renders the step title within the layout', () => {
    render(<BackgroundStep />);
    expect(screen.getByRole('heading', { name: 'App background' })).toBeInTheDocument();
  });
});
