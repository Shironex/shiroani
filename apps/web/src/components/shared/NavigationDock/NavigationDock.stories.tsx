import type { Meta, StoryObj } from '@storybook/react-vite';
import { useDockStore } from '@/stores/useDockStore';
import NavigationDock from './NavigationDock';

// Explicitly annotated (not `satisfies`) because the inline store-seeding
// decorator makes the inferred `meta` type reference storybook-internal CSF
// types that can't be named portably.
const meta: Meta<typeof NavigationDock> = {
  title: 'shared/NavigationDock',
  component: NavigationDock,
  parameters: { layout: 'fullscreen' },
  decorators: [
    Story => {
      useDockStore.setState({
        edge: 'bottom',
        offset: 50,
        autoHide: false,
        draggable: true,
        showLabels: true,
        isDragging: false,
        dragPosition: null,
        isExpanded: false,
      });
      return (
        <div style={{ height: '100vh', position: 'relative' }}>
          <Story />
        </div>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof NavigationDock>;

export const Default: Story = {
  args: { hasBg: false },
};
