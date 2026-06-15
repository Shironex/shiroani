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
    expect(screen.getByText('Top staff')).toBeInTheDocument();
    expect(screen.getByText('Hayao Miyazaki')).toBeInTheDocument();
    expect(screen.getByText('By start year')).toBeInTheDocument();
    expect(screen.getByText('By episode count')).toBeInTheDocument();
  });

  it('omits a block whose array is empty', () => {
    render(
      <ProfileExtraStats
        stats={{ ...mockExtraStats, staff: [], lengths: [] }}
        renderHead={renderHead}
      />
    );
    expect(screen.getByText('Top voice actors')).toBeInTheDocument();
    expect(screen.queryByText('Top staff')).not.toBeInTheDocument();
    expect(screen.queryByText('By episode count')).not.toBeInTheDocument();
  });

  it('orders start years newest-first as a timeline', () => {
    render(
      <ProfileExtraStats
        stats={{
          ...mockUserProfile.statistics,
          startYears: [
            { value: 2021, count: 10, meanScore: 70, minutesWatched: 5000 },
            { value: 2023, count: 40, meanScore: 80, minutesWatched: 20000 },
            { value: 2022, count: 30, meanScore: 78, minutesWatched: 15000 },
          ],
        }}
        renderHead={renderHead}
      />
    );
    const years = screen.getAllByText(/^20(21|22|23)$/).map(el => el.textContent);
    expect(years).toEqual(['2023', '2022', '2021']);
  });

  it('renders nothing when no richer stats arrays are present', () => {
    const { container } = render(
      <ProfileExtraStats stats={mockUserProfile.statistics} renderHead={renderHead} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
