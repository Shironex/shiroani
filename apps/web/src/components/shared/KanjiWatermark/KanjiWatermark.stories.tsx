import type { Meta, StoryObj } from '@storybook/react-vite';
import KanjiWatermark from './KanjiWatermark';

const meta = {
  title: 'shared/KanjiWatermark',
  component: KanjiWatermark,
} satisfies Meta<typeof KanjiWatermark>;

export default meta;

type Story = StoryObj<typeof KanjiWatermark>;

export const Default: Story = {
  args: { kanji: '影', position: 'br', size: 160, opacity: 0.12 },
};
