import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import PersonCard from './PersonCard';

describe('PersonCard', () => {
  it('renders the name and subtitle', () => {
    render(<PersonCard name="Frieren" subtitle="main" />);

    expect(screen.getByText('Frieren')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('renders an avatar image when imageUrl is provided', () => {
    render(<PersonCard imageUrl="avatar.jpg" name="Fern" subtitle="supporting" />);

    expect(screen.getByAltText('Fern')).toBeInTheDocument();
  });
});
