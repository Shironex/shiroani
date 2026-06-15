import type { Meta, StoryObj } from '@storybook/react-vite';
import DiarySkeleton from './DiarySkeleton';

/**
 * Loading placeholder for the diary timeline — a vertical rail with a handful of
 * entry-card shapes that mirror `DiaryTimeline`'s layout, so the view doesn't
 * flash the onboarding CTA while the initial fetch is in flight. Purely
 * presentational; the root carries `aria-busy` to announce the loading state.
 */
const meta = {
  title: 'diary/DiarySkeleton',
  component: DiarySkeleton,
  parameters: {
    // Decorative shimmer shapes carry no interactive content; the busy region is
    // announced via aria-busy. Passes axe clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof DiarySkeleton>;

export default meta;

type Story = StoryObj<typeof DiarySkeleton>;

export const Default: Story = {};
