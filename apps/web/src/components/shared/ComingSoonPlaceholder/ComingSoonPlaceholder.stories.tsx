import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkles } from 'lucide-react';
import ComingSoonPlaceholder from './ComingSoonPlaceholder';

const meta = {
  title: 'shared/ComingSoonPlaceholder',
  component: ComingSoonPlaceholder,
} satisfies Meta<typeof ComingSoonPlaceholder>;

export default meta;

type Story = StoryObj<typeof ComingSoonPlaceholder>;

export const Default: Story = {
  args: {
    icon: Sparkles,
    title: 'Activity heatmap',
    description: 'This surface is still being polished and will land in a future release.',
    tag: 'SOON',
  },
};
