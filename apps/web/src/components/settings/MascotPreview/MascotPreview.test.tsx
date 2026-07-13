import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { APP_LOGO_URL } from '@/lib/constants';
import { useMascotSpriteStore } from '@/stores/useMascotSpriteStore';
import { MascotPreview } from '.';

describe('MascotPreview', () => {
  beforeEach(() => {
    useMascotSpriteStore.setState({
      customSpriteUrl: null,
      customSpriteFileName: null,
      scaleMode: 'contain',
    });
  });

  afterEach(() => {
    useMascotSpriteStore.setState({ customSpriteUrl: null, scaleMode: 'contain' });
  });

  it('renders the three chibi anchors without throwing', () => {
    expect(() =>
      render(<MascotPreview current={128} min={48} max={256} label="Preview" />)
    ).not.toThrow();
  });

  it('labels each chibi with its real px size and anchor name', () => {
    render(<MascotPreview current={128} min={48} max={256} label="Preview" />);
    expect(screen.getByText(/48px · MIN/)).toBeInTheDocument();
    expect(screen.getByText(/128px · CURRENT/)).toBeInTheDocument();
    expect(screen.getByText(/256px · MAX/)).toBeInTheDocument();
  });

  it('reflects the current slider value in the middle chibi caption', () => {
    const { rerender } = render(<MascotPreview current={96} min={48} max={256} label="Preview" />);
    expect(screen.getByText(/96px · CURRENT/)).toBeInTheDocument();
    rerender(<MascotPreview current={200} min={48} max={256} label="Preview" />);
    expect(screen.getByText(/200px · CURRENT/)).toBeInTheDocument();
  });

  it('falls back to the app logo with contain fit when no custom sprite is set', () => {
    render(<MascotPreview current={128} min={48} max={256} />);
    const imgs = screen.getAllByRole('presentation');
    expect(imgs).toHaveLength(3);
    for (const img of imgs) {
      expect(img).toHaveAttribute('src', APP_LOGO_URL);
      expect(img).toHaveStyle({ objectFit: 'contain' });
    }
  });

  it('uses the custom sprite URL when one is set', () => {
    useMascotSpriteStore.setState({ customSpriteUrl: 'shiroani-mascot://sprites/demo.png' });
    render(<MascotPreview current={128} min={48} max={256} />);
    for (const img of screen.getAllByRole('presentation')) {
      expect(img).toHaveAttribute('src', 'shiroani-mascot://sprites/demo.png');
    }
  });

  it('maps the cover scale mode to object-fit: cover', () => {
    useMascotSpriteStore.setState({
      customSpriteUrl: 'shiroani-mascot://sprites/demo.png',
      scaleMode: 'cover',
    });
    render(<MascotPreview current={128} min={48} max={256} />);
    expect(screen.getAllByRole('presentation')[0]).toHaveStyle({ objectFit: 'cover' });
  });

  it('maps the stretch scale mode to object-fit: fill', () => {
    useMascotSpriteStore.setState({
      customSpriteUrl: 'shiroani-mascot://sprites/demo.png',
      scaleMode: 'stretch',
    });
    render(<MascotPreview current={128} min={48} max={256} />);
    expect(screen.getAllByRole('presentation')[0]).toHaveStyle({ objectFit: 'fill' });
  });

  it('renders the optional label caption above the stage', () => {
    render(<MascotPreview current={128} min={48} max={256} label="Preview" />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });
});
