import type { Meta, StoryObj } from '@storybook/react-vite';
import ThemeVariableField from './ThemeVariableField';

const meta = {
  title: 'settings/theme-editor/ThemeVariableField',
  component: ThemeVariableField,
} satisfies Meta<typeof ThemeVariableField>;

export default meta;

type Story = StoryObj<typeof ThemeVariableField>;

export const Default: Story = {
  args: {
    varName: 'primary',
    group: { labelKey: 'main', variables: ['primary'] },
    value: 'oklch(0.6 0.2 280)',
    onChange: () => {},
  },
};
