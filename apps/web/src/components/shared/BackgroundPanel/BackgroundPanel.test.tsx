import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { BackgroundPanel } from '@/components/shared/BackgroundPanel';

describe('BackgroundPanel', () => {
  beforeEach(() => {
    useBackgroundStore.setState({
      customBackground: null,
      backgroundOpacity: 0.6,
      backgroundBlur: 0,
      backgroundDim: 0.6,
    });
  });

  it('renders a pick-image button in the card variant', () => {
    render(<BackgroundPanel variant="card" />);
    expect(screen.getByText('Pick image')).toBeInTheDocument();
  });
});
