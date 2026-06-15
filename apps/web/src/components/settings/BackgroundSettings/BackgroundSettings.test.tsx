import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import BackgroundSettings from './BackgroundSettings';

describe('BackgroundSettings', () => {
  it('renders the background card title', () => {
    render(<BackgroundSettings />);
    expect(screen.getByText('App background')).toBeInTheDocument();
  });
});
