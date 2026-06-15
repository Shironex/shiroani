import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { render, screen } from '@/test/test-utils';
import { SortableList, SortableListRow, useSortableList } from '@/components/shared/SortableList';

const items = ['library', 'diary', 'schedule'];

function renderList(extra?: {
  onReorder?: (a: string, b: string) => void;
  rowProps?: Partial<React.ComponentProps<typeof SortableListRow>>;
}) {
  return render(
    <SortableList items={items} onReorder={extra?.onReorder ?? (() => {})}>
      {items.map(id => (
        <SortableListRow key={id} id={id} dragHandleLabel={`Reorder ${id}`} {...extra?.rowProps}>
          <span>{id}</span>
        </SortableListRow>
      ))}
    </SortableList>
  );
}

describe('SortableList', () => {
  it('renders each row with its content and a labelled drag grip', () => {
    renderList();

    for (const id of items) {
      expect(screen.getByText(id)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Reorder ${id}` })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(items.length);
  });

  it('renders an empty list without crashing and shows no rows', () => {
    render(
      <SortableList items={[]} onReorder={() => {}}>
        {null}
      </SortableList>
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('forwards a className onto the list container', () => {
    const { container } = render(
      <SortableList items={items} onReorder={() => {}} className="custom-list">
        <SortableListRow id="library" dragHandleLabel="Reorder">
          <span>library</span>
        </SortableListRow>
      </SortableList>
    );
    expect(container.querySelector('.custom-list')).toBeInTheDocument();
  });

  it('wires grip focus/blur and row hover callbacks', async () => {
    const onGripFocus = vi.fn();
    const onGripBlur = vi.fn();
    const { user } = renderList({ rowProps: { onGripFocus, onGripBlur } });

    const grip = screen.getAllByRole('button')[0];
    grip.focus();
    expect(onGripFocus).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(onGripBlur).toHaveBeenCalledTimes(1);
  });

  describe('useSortableList drag-end → reorder bridge', () => {
    const dragEvent = (activeId: string, overId: string | null): DragEndEvent =>
      ({
        active: { id: activeId },
        over: overId === null ? null : { id: overId },
      }) as unknown as DragEndEvent;

    it('calls onReorder with (activeId, overId) when dropped on a different item', () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() => useSortableList(onReorder));

      result.current.handleDragEnd(dragEvent('library', 'schedule'));
      expect(onReorder).toHaveBeenCalledWith('library', 'schedule');
    });

    it('does not call onReorder when dropped on itself', () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() => useSortableList(onReorder));

      result.current.handleDragEnd(dragEvent('library', 'library'));
      expect(onReorder).not.toHaveBeenCalled();
    });

    it('does not call onReorder when there is no drop target', () => {
      const onReorder = vi.fn();
      const { result } = renderHook(() => useSortableList(onReorder));

      result.current.handleDragEnd(dragEvent('library', null));
      expect(onReorder).not.toHaveBeenCalled();
    });

    it('exposes pointer + keyboard sensors for accessible reordering', () => {
      const { result } = renderHook(() => useSortableList(() => {}));
      expect(result.current.sensors).toHaveLength(2);
    });
  });
});
