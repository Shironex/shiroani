import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DockEdge } from '@/stores/useDockStore';
import DockEdgePicker from './DockEdgePicker';

const LABELS: Record<DockEdge, string> = {
  bottom: 'Dół',
  top: 'Góra',
  left: 'Lewo',
  right: 'Prawo',
};

const meta = {
  title: 'shared/DockEdgePicker',
  component: DockEdgePicker,
} satisfies Meta<typeof DockEdgePicker>;

export default meta;

type Story = StoryObj<typeof DockEdgePicker>;

export const Text: Story = {
  args: { value: 'bottom', onSelect: () => {}, getLabel: e => LABELS[e], ariaLabel: 'Dock edge' },
};

export const Illustrated: Story = {
  args: {
    value: 'left',
    onSelect: () => {},
    getLabel: e => LABELS[e],
    ariaLabel: 'Dock edge',
    variant: 'illustrated',
  },
};
