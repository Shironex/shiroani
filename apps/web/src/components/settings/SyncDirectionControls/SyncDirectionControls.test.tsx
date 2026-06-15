import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SyncModeSelector } from './';

describe('SyncDirectionControls', () => {
  it('renders the direction modes as an accessible radiogroup', () => {
    render(<SyncModeSelector provider="anilist" value="two-way" onChange={() => {}} />);

    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });
});
