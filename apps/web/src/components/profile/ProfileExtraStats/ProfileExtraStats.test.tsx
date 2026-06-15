import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { mockExtraStats, mockUserProfile } from '../profile-fixtures';
import ProfileExtraStats from './ProfileExtraStats';

const renderHead = (label: string) => <h3>{label}</h3>;

describe('ProfileExtraStats', () => {
  it('renders each populated optional stats block', () => {
    render(<ProfileExtraStats stats={mockExtraStats} renderHead={renderHead} />);
    expect(screen.getByText('Top voice actors')).toBeInTheDocument();
    expect(screen.getByText('Saori Hayami')).toBeInTheDocument();
    expect(screen.getByText('By start year')).toBeInTheDocument();
  });

  it('renders nothing when no richer stats arrays are present', () => {
    const { container } = render(
      <ProfileExtraStats stats={mockUserProfile.statistics} renderHead={renderHead} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
