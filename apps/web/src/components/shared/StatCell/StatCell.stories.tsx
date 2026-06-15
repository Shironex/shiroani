import type { Meta, StoryObj } from '@storybook/react-vite';
import StatCell from './StatCell';

/**
 * A small stat primitive: a mono-uppercase caption label over a bold value, with an
 * optional sub descriptor (e.g. "of 220"). Used on Profile, Library stats and the
 * Diary sidebar. The value can be any `ReactNode`, and `serif` swaps the value to the
 * Mincho serif face for headline-style figures.
 */
const meta = {
  title: 'shared/StatCell',
  component: StatCell,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    label: { description: 'Small caption shown above the value.' },
    value: { description: 'The headline figure. Accepts any ReactNode.' },
    sub: { description: 'Optional descriptor rendered under the value (e.g. "of 220").' },
    serif: { control: 'boolean', description: 'Render the value in the Mincho serif face.' },
  },
} satisfies Meta<typeof StatCell>;

export default meta;

type Story = StoryObj<typeof StatCell>;

/** Label + numeric value + sub descriptor. */
export const Default: Story = {
  args: { label: 'Obejrzane', value: 184, sub: 'z 220' },
};

/** Value only, no sub descriptor. */
export const ValueOnly: Story = {
  args: { label: 'Porzucone', value: 12 },
};

/** Serif value styling for headline figures. */
export const Serif: Story = {
  args: { label: 'Średnia ocena', value: '8,4', serif: true },
};

/** Long label and value to exercise wrapping/overflow. */
export const LongText: Story = {
  args: { label: 'Łączny czas oglądania', value: '1 234 567', sub: 'minut' },
};
