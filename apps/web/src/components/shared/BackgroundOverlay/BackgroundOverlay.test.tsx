import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { BackgroundOverlay } from '@/components/shared/BackgroundOverlay';
import { useBackgroundStore } from '@/stores/useBackgroundStore';

const DEFAULT_OPACITY = 0.15;

describe('BackgroundOverlay', () => {
  beforeEach(() => {
    useBackgroundStore.setState({ backgroundOpacity: DEFAULT_OPACITY });
  });

  afterEach(() => {
    useBackgroundStore.setState({ backgroundOpacity: DEFAULT_OPACITY });
  });

  it('renders a fixed, aria-hidden overlay that ignores pointer events', () => {
    const { container } = render(<BackgroundOverlay />);
    const root = container.querySelector('[aria-hidden="true"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass('fixed', 'inset-0', 'pointer-events-none');
    expect(root).toHaveStyle({ zIndex: '0' });
  });

  it('renders two layers: the image layer and the readability scrim', () => {
    const { container } = render(<BackgroundOverlay />);
    const layers = container.querySelectorAll('[aria-hidden="true"] > div');
    expect(layers).toHaveLength(2);
  });

  it('drives the image layer opacity from the background store value', () => {
    useBackgroundStore.setState({ backgroundOpacity: 0.42 });
    const { container } = render(<BackgroundOverlay />);
    const imageLayer = container.querySelectorAll('[aria-hidden="true"] > div')[0] as HTMLElement;
    expect(imageLayer.style.opacity).toBe('0.42');
  });

  it('uses the default store opacity when none has been set', () => {
    const { container } = render(<BackgroundOverlay />);
    const imageLayer = container.querySelectorAll('[aria-hidden="true"] > div')[0] as HTMLElement;
    expect(imageLayer.style.opacity).toBe(String(DEFAULT_OPACITY));
  });

  it('sources the image, blur and scrim alpha from CSS custom properties', () => {
    const { container } = render(<BackgroundOverlay />);
    const layers = container.querySelectorAll('[aria-hidden="true"] > div');
    const imageLayer = layers[0] as HTMLElement;
    const scrim = layers[1] as HTMLElement;

    expect(imageLayer.style.backgroundImage).toBe('var(--app-bg-image)');
    expect(imageLayer.style.filter).toContain('var(--app-bg-blur, 0px)');
    expect(scrim.style.opacity).toContain('var(--app-bg-dim, 0.6)');
    expect(scrim).toHaveClass('bg-background');
  });

  it('exposes no semantic content to the accessibility tree', () => {
    const { container } = render(<BackgroundOverlay />);
    expect(container.textContent).toBe('');
  });
});
