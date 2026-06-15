import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import RandomFiltersPanel from './RandomFiltersPanel';

function renderPanel(overrides: Partial<Parameters<typeof RandomFiltersPanel>[0]> = {}) {
  const onChange = vi.fn();
  const result = render(
    <RandomFiltersPanel
      included={['Action']}
      excluded={[]}
      disabled={false}
      onChange={onChange}
      {...overrides}
    />
  );
  return { ...result, onChange };
}

describe('RandomFiltersPanel', () => {
  it('renders the genre picker when expanded by default', () => {
    renderPanel();

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('Horror')).toBeInTheDocument();
  });

  it('summarizes both included and excluded counts', () => {
    renderPanel({ included: ['Action', 'Comedy'], excluded: ['Horror'] });

    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.getByText('−1')).toBeInTheDocument();
  });

  it('collapses the genre picker when the header is toggled', async () => {
    const { user } = renderPanel();

    expect(screen.getByText('Horror')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /genres/i }));

    expect(screen.queryByText('Horror')).not.toBeInTheDocument();
  });

  it('forwards genre changes from the picker', async () => {
    const { user, onChange } = renderPanel();

    await user.click(screen.getByText('Comedy'));

    expect(onChange).toHaveBeenCalledWith(['Action', 'Comedy'], []);
  });
});
