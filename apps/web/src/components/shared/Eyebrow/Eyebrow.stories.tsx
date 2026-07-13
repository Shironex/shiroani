import type { Meta, StoryObj } from '@storybook/react-vite';
import Eyebrow from './Eyebrow';

/**
 * The canonical mono uppercase kicker used above sections and form fields.
 * Renders a `<span>` by default, or a `<label>` when `htmlFor` is set.
 */
const meta = {
  title: 'shared/Eyebrow',
  component: Eyebrow,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    htmlFor: {
      description: 'Field id to bind — switches the element from `<span>` to `<label>`.',
    },
  },
} satisfies Meta<typeof Eyebrow>;

export default meta;

type Story = StoryObj<typeof Eyebrow>;

export const SectionKicker: Story = {
  args: { children: 'Selected work' },
};

export const FieldLabel: Story = {
  render: args => (
    <div className="flex flex-col gap-2">
      <Eyebrow {...args} htmlFor="eyebrow-demo-input">
        Display name
      </Eyebrow>
      <input id="eyebrow-demo-input" className="border border-border rounded-md px-2 py-1" />
    </div>
  ),
  args: { children: 'Display name' },
};
