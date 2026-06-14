import type { Meta, StoryObj } from '@storybook/react-vite';
import { withFullHeight } from '../../../../.storybook/decorators';
import DiaryView from './DiaryView';

const meta = {
  title: 'diary/DiaryView',
  component: DiaryView,
  parameters: { layout: 'fullscreen' },
  decorators: [withFullHeight],
} satisfies Meta<typeof DiaryView>;

export default meta;

type Story = StoryObj<typeof DiaryView>;

export const Default: Story = {};
