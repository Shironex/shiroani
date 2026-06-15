import type { Meta, StoryObj } from '@storybook/react-vite';
import ColorPickerField from './ColorPickerField';

const meta = {
  title: 'settings/ColorPickerField',
  component: ColorPickerField,
} satisfies Meta<typeof ColorPickerField>;

export default meta;

type Story = StoryObj<typeof ColorPickerField>;

export const Default: Story = {
  args: {
    label: 'Primary',
    variableName: 'primary',
    value: 'oklch(0.6 0.2 280)',
    onChange: () => {},
  },
};
