import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sparkles } from 'lucide-react';
import ComingSoonPlaceholder from './ComingSoonPlaceholder';

/**
 * Reusable "coming soon" panel for surfaces that haven't been built/ported yet.
 * Renders a decorative icon tile, an uppercase tag (defaults to the localized
 * "SOON"), a serif title and an optional description. Purely presentational —
 * no interactive controls.
 */
const meta = {
  title: 'shared/ComingSoonPlaceholder',
  component: ComingSoonPlaceholder,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    icon: { description: 'Lucide icon rendered (decoratively) in the tile. Defaults to Sparkles.' },
    title: { description: 'Main heading of the placeholder.' },
    description: { description: 'Optional supporting paragraph beneath the title.' },
    tag: { description: 'Short uppercase label above the title. Defaults to localized "SOON".' },
  },
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

export const NoDescription: Story = {
  args: {
    icon: Sparkles,
    title: 'Activity heatmap',
    tag: 'BETA',
  },
};
