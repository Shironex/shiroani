import type { Meta, StoryObj } from '@storybook/react-vite';
import FadeInImage from './FadeInImage';

/**
 * `<img>` wrapper that fades the bitmap in once it decodes, smoothing the
 * pop-in of lazily loaded covers and banners. Forwards every native `<img>`
 * prop plus a ref.
 */
const meta = {
  title: 'shared/FadeInImage',
  component: FadeInImage,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    src: { description: 'Image source, forwarded to the native `<img>`.' },
    alt: { description: 'Alt text, forwarded to the native `<img>`.' },
  },
} satisfies Meta<typeof FadeInImage>;

export default meta;

type Story = StoryObj<typeof FadeInImage>;

export const Default: Story = {
  args: {
    src: 'https://picsum.photos/seed/shiroani-cover/240/340',
    alt: 'Przykładowa okładka',
    className: 'w-[240px] aspect-[2/3] rounded-lg object-cover',
  },
};
