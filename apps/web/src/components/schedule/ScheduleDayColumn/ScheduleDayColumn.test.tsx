import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import ScheduleDayColumn from './ScheduleDayColumn';

describe('ScheduleDayColumn', () => {
  it('renders the header label and the empty-state copy when there are no entries', () => {
    render(
      <ScheduleDayColumn
        day="2000-01-01"
        label="MON"
        entries={[]}
        now={1717000000}
        renderCard={() => null}
        emptyLabel="Brak odcinków"
      />
    );
    expect(screen.getByText('MON')).toBeInTheDocument();
    expect(screen.getByText('Brak odcinków')).toBeInTheDocument();
  });
});
