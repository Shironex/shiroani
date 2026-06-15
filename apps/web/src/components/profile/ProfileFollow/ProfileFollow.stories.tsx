import type { Meta, StoryObj } from '@storybook/react-vite';
import ProfileFollow from './ProfileFollow';

const renderHead = (label: string) => (
  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
    {label}
  </h3>
);

const meta = {
  title: 'profile/ProfileFollow',
  component: ProfileFollow,
  args: { renderHead },
} satisfies Meta<typeof ProfileFollow>;

export default meta;

type Story = StoryObj<typeof ProfileFollow>;

/**
 * Disconnected state — the social graph is viewer-scoped, so with no connected
 * AniList account the section renders nothing (rather than an empty list that
 * would read as a bug). Connected/populated states are socket-backed and live
 * in integration tests.
 */
export const NotConnected: Story = {};
