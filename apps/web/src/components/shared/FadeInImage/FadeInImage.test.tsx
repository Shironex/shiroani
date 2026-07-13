import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/test/test-utils';
import { FadeInImage } from '@/components/shared/FadeInImage';

describe('FadeInImage', () => {
  it('starts hidden and fades in on load', () => {
    render(<FadeInImage src="/cover.jpg" alt="Okładka" />);
    const img = screen.getByRole('img', { name: 'Okładka' });
    expect(img).toHaveClass('opacity-0');

    fireEvent.load(img);
    expect(img).toHaveClass('opacity-100');
  });

  it('forwards native img props', () => {
    render(<FadeInImage src="/cover.jpg" alt="Okładka" loading="lazy" />);
    const img = screen.getByRole('img', { name: 'Okładka' });
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('src', '/cover.jpg');
  });

  it('merges custom className with the transition classes', () => {
    render(<FadeInImage src="/cover.jpg" alt="Okładka" className="rounded-lg" />);
    const img = screen.getByRole('img', { name: 'Okładka' });
    expect(img).toHaveClass('transition-opacity');
    expect(img).toHaveClass('rounded-lg');
  });
});
