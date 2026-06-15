import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { arrayMove } from '@dnd-kit/sortable';
import SortableList, { SortableListRow } from './SortableList';

const meta = {
  title: 'shared/SortableList',
  component: SortableList,
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
