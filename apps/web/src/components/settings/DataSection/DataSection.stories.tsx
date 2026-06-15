import type { Meta, StoryObj } from '@storybook/react-vite';
import DataSection from './DataSection';

const meta = {
  title: 'settings/DataSection',
  component: DataSection,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DataSection>;

export default meta;

type Story = StoryObj<typeof DataSection>;

/**
 * Default mount — export / import / danger-zone cards with their dialogs closed.
 * Library and diary counts read from the live stores (empty in Storybook).
 */
export const Default: Story = {};
