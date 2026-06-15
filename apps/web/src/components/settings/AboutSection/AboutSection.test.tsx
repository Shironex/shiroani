import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AboutSection from './AboutSection';

describe('AboutSection', () => {
  it('renders the story card title', () => {
    render(<AboutSection />);
    expect(screen.getByText('Story')).toBeInTheDocument();
  });
});
