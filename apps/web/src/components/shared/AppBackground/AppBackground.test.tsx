import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { AppBackground } from '@/components/shared/AppBackground';

describe('AppBackground', () => {
  it('renders a decorative, aria-hidden backdrop that ignores pointer events', () => {
    const { container } = render(<AppBackground />);
    const root = container.querySelector('[aria-hidden="true"]');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass('pointer-events-none');
    expect(root).toHaveClass('absolute', 'inset-0', 'overflow-hidden');
  });

  it('sits behind content at z-index 0', () => {
    const { container } = render(<AppBackground />);
    const root = container.querySelector('[aria-hidden="true"]');
    expect(root).toHaveStyle({ zIndex: '0' });
  });

  it('renders the theme-token radial glow layer and the noise overlay', () => {
    const { container } = render(<AppBackground />);
    const layers = container.querySelectorAll('[aria-hidden="true"] > div');
    // Two decorative layers: radial glow + fractal-noise overlay.
    expect(layers).toHaveLength(2);

    const glow = layers[0] as HTMLElement;
    expect(glow.style.backgroundImage).toContain('var(--glow-1)');
    expect(glow.style.backgroundImage).toContain('var(--glow-2)');
  });

  it('renders the noise overlay with overlay blend mode and low opacity', () => {
    const { container } = render(<AppBackground />);
    const noise = container.querySelectorAll('[aria-hidden="true"] > div')[1] as HTMLElement;
    expect(noise.style.mixBlendMode).toBe('overlay');
    expect(noise.style.opacity).toBe('0.05');
    expect(noise.style.backgroundImage).toContain('svg');
  });

  it('exposes no semantic content to the accessibility tree', () => {
    const { container } = render(<AppBackground />);
    // Purely decorative: nothing should carry a role or accessible text.
    expect(container.textContent).toBe('');
  });
});
