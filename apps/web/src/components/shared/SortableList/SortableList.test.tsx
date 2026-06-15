import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SortableList, SortableListRow } from '@/components/shared/SortableList';

describe('SortableList', () => {
  it('renders each row with a labelled drag grip', () => {
    const items = ['library', 'diary'];
    render(
      <SortableList items={items} onReorder={() => {}}>
        {items.map(id => (
          <SortableListRow key={id} id={id} dragHandleLabel={`Reorder ${id}`}>
            <span>{id}</span>
          </SortableListRow>
        ))}
      </SortableList>
    );

    expect(screen.getByText('library')).toBeInTheDocument();
    expect(screen.getByText('diary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder library' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder diary' })).toBeInTheDocument();
  });
});
