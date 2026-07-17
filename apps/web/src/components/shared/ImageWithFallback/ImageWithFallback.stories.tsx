import type { Meta, StoryObj } from '@storybook/react-vite';
import { Film } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';

/**
 * A cover/avatar frame with a local placeholder fallback. Size and radius come
 * from `className`; the bitmap fades in on decode and swaps to `fallback` when
 * there's no `src` or it fails to load.
 */
const meta = {
  title: 'shared/ImageWithFallback',
  component: ImageWithFallback,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    src: { description: 'Image source; falls back to the placeholder when absent or broken.' },
    alt: { description: 'Alt text for the decoded image.' },
    fallback: { control: false, description: 'Placeholder node shown when there is no image.' },
  },
} satisfies Meta<typeof ImageWithFallback>;

export default meta;

type Story = StoryObj<typeof ImageWithFallback>;

const filmFallback = <Film className="w-3.5 h-3.5 text-muted-foreground/30" aria-hidden="true" />;

/** Decoded cover — the bitmap fades in inside the sized frame. */
export const WithImage: Story = {
  args: {
    src: 'https://picsum.photos/seed/shiroani-thumb/40/56',
    alt: 'Przykładowa okładka',
    className: 'w-10 h-14 rounded-md',
    fallback: filmFallback,
  },
};

/** No source — the placeholder icon is centred in the frame instead. */
export const Placeholder: Story = {
  args: {
    src: undefined,
    alt: '',
    className: 'w-10 h-14 rounded-md',
    fallback: filmFallback,
  },
};
