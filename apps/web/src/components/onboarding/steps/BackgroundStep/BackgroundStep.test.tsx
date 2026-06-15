import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import BackgroundStep from './BackgroundStep';

beforeEach(() => {
  useBackgroundStore.setState({
    customBackground: null,
    backgroundOpacity: 0.6,
    backgroundBlur: 4,
    backgroundDim: 0.5,
  });
});

describe('BackgroundStep', () => {
  it('renders the step title within the layout', () => {
    render(<BackgroundStep />);
    expect(screen.getByRole('heading', { name: 'App background' })).toBeInTheDocument();
  });

  it('disables the sliders until an image is chosen', () => {
    render(<BackgroundStep />);

    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(3);
    // Onboarding variant keeps the named sliders disabled with no background.
    sliders.forEach(slider => expect(slider).toHaveAttribute('data-disabled'));
    expect(screen.getByRole('slider', { name: 'Blur' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Opacity' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Dim' })).toBeInTheDocument();
  });

  it('delegates the pick action to the background store', async () => {
    const pickBackground = vi.fn().mockResolvedValue(undefined);
    useBackgroundStore.setState({ pickBackground });
    const { user } = render(<BackgroundStep />);

    await user.click(screen.getByRole('button', { name: 'Pick image' }));

    expect(pickBackground).toHaveBeenCalledTimes(1);
  });

  it('enables the sliders and reveals reset once a background is set', () => {
    useBackgroundStore.setState({ customBackground: 'data:image/png;base64,AAAA' });
    render(<BackgroundStep />);

    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
    screen
      .getAllByRole('slider')
      .forEach(slider => expect(slider).not.toHaveAttribute('data-disabled'));
  });
});
