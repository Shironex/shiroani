import { useCallback, useRef, type KeyboardEvent } from 'react';
import type { DockEdge } from '@/stores/useDockStore';
import { DOCK_EDGES } from './DockEdgePicker.parts';
import type { IDockEdgePickerView } from './DockEdgePicker.types';

interface IUseDockEdgePickerArgs {
  value: DockEdge;
  onSelect: (edge: DockEdge) => void;
}

export function useDockEdgePicker({
  value,
  onSelect,
}: IUseDockEdgePickerArgs): IDockEdgePickerView {
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // WAI-ARIA APG radiogroup: arrow keys move (with wrap) the checked radio and
  // shift focus to it; Right/Down go forward, Left/Up go backward.
  const move = useCallback(
    (delta: number) => {
      const currentIndex = DOCK_EDGES.indexOf(value);
      const nextIndex = (currentIndex + delta + DOCK_EDGES.length) % DOCK_EDGES.length;
      onSelect(DOCK_EDGES[nextIndex]);
      radioRefs.current[nextIndex]?.focus();
    },
    [value, onSelect]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        move(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        move(-1);
      }
    },
    [move]
  );

  const registerRadio = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      radioRefs.current[index] = el;
    },
    []
  );

  return { registerRadio, handleKeyDown };
}
