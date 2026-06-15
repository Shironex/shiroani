import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { arrayMove } from '@dnd-kit/sortable';
import { within, userEvent, expect } from 'storybook/test';
import SortableList, { SortableListRow } from './SortableList';

/**
 * A vertical drag-to-reorder list built on `@dnd-kit`. The container owns the
 * sensor setup (pointer + keyboard) and the vertical-axis restriction; each
 * `SortableListRow` renders a labelled drag grip plus arbitrary children
 * (label, badge, control). Reorders are reported through `onReorder(activeId,
 * overId)` — the parent owns the item order. Used by the Settings panel-order
 * and New-Tab panel-order lists.
 */
const meta = {
  title: 'shared/SortableList',
  component: SortableList,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    items: { description: 'Ordered list of stable item ids matching the rendered rows.' },
    onReorder: { description: 'Fired with (activeId, overId) when an item is dropped elsewhere.' },
    children: { description: 'One `SortableListRow` per item id.' },
  },
} satisfies Meta<typeof SortableList>;

export default meta;

type Story = StoryObj<typeof SortableList>;

export const Default: Story = {
  render: () => {
    const [items, setItems] = useState(['Library', 'Diary', 'Schedule', 'Feed']);
    return (
      <SortableList
        items={items}
        onReorder={(activeId, overId) => {
          setItems(prev => arrayMove(prev, prev.indexOf(activeId), prev.indexOf(overId)));
        }}
      >
        {items.map(id => (
          <SortableListRow key={id} id={id} dragHandleLabel={`Reorder ${id}`}>
            <span className="text-sm text-foreground">{id}</span>
          </SortableListRow>
        ))}
      </SortableList>
    );
  },
};

/**
 * Verifies the per-row drag affordance: every row exposes a labelled grip
 * button that can receive keyboard focus (the entry point for accessible
 * keyboard reordering). Pointer-drag itself is exercised in the app, not here —
 * @dnd-kit pointer simulation is unreliable in a headless runner.
 */
export const HasFocusableGrips: Story = {
  ...Default,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const grip = canvas.getByRole('button', { name: 'Reorder Library' });
    await expect(canvas.getAllByRole('button')).toHaveLength(4);
    grip.focus();
    await expect(grip).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: 'Reorder Diary' })).toHaveFocus();
  },
};
