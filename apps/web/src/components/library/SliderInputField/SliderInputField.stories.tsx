import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import SliderInputField from './SliderInputField';

const meta = {
  title: 'library/SliderInputField',
  component: SliderInputField,
} satisfies Meta<typeof SliderInputField>;

export default meta;

type Story = StoryObj<typeof SliderInputField>;

export const Default: Story = {
  args: { label: 'Progress', value: 5, min: 0, max: 12, onChange: () => {} },
  render: args => {
    const [value, setValue] = useState(args.value);
    return <SliderInputField {...args} value={value} onChange={setValue} />;
  },
};

export const WithoutSlider: Story = {
  args: { label: 'Progress', value: 3, min: 0, max: 12, showSlider: false, onChange: () => {} },
};

export const Disabled: Story = {
  args: { label: 'Progress', value: 12, min: 0, max: 12, disabled: true, onChange: () => {} },
};
