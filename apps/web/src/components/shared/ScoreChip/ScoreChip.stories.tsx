import type { Meta, StoryObj } from '@storybook/react-vite';
import ScoreChip from './ScoreChip';

/**
 * A gold star + tabular score value, used for average/user scores across
 * Discover, Library, and Schedule. Pass `scrim` for the over-image variant
 * (adds a dark scrim so the chip stays legible on covers).
 */
const meta = {
  title: 'shared/ScoreChip',
  component: ScoreChip,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    value: { description: 'Pre-formatted score value (e.g. "8.4").' },
    scrim: { description: 'Over-image variant — adds a dark scrim behind the gold text.' },
  },
} satisfies Meta<typeof ScoreChip>;

export default meta;

type Story = StoryObj<typeof ScoreChip>;

export const Default: Story = {
  args: { value: '8.4' },
};

export const Scrim: Story = {
  args: { value: '8.4', scrim: true },
  render: args => (
    <div className="relative h-24 w-40 rounded-md bg-[url('https://picsum.photos/seed/scorechip/320/192')] bg-cover p-2">
      <ScoreChip {...args} className="absolute top-2 right-2" />
    </div>
  ),
};
