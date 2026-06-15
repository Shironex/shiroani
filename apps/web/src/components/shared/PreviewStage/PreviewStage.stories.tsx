import type { Meta, StoryObj } from '@storybook/react-vite';
import PreviewStage from './PreviewStage';

/**
 * The shared gridded-gradient backdrop for every settings preview. A dark
 * diagonal base gradient with a recolorable radial glow and a faint grid
 * overlay, wrapped in a rounded glass border. Callers render their live preview
 * as `children`; an optional uppercase `label` caption sits above the stage.
 * It is purely presentational — no interactive controls.
 */
const meta = {
  title: 'shared/PreviewStage',
  component: PreviewStage,
  parameters: {
    a11y: { test: 'error' },
  },
  argTypes: {
    label: { description: 'Optional uppercase caption rendered above the stage (e.g. "PODGLĄD").' },
    height: {
      description: 'Stage height in px (default 144). Ignored when heightClassName is set.',
    },
    heightClassName: { description: 'Tailwind height class; takes precedence over height.' },
    border: {
      control: 'inline-radio',
      options: ['full', 'bottom'],
      description: '"full" = rounded glass border (default); "bottom" = bottom divider only.',
    },
    glow: { description: 'Override the radial glow layer (color + position).' },
  },
} satisfies Meta<typeof PreviewStage>;

export default meta;

type Story = StoryObj<typeof PreviewStage>;

export const Default: Story = {
  args: {
    label: 'PODGLĄD',
    children: <div className="absolute inset-0 grid place-items-center text-white/70">Preview</div>,
  },
};

export const WithoutLabel: Story = {
  args: {
    children: <div className="absolute inset-0 grid place-items-center text-white/70">Preview</div>,
  },
};

export const BottomBorder: Story = {
  args: {
    border: 'bottom',
    glow: 'radial-gradient(circle at 70% 30%, oklch(0.5 0.18 25 / 0.3), transparent 60%)',
    children: (
      <div className="absolute inset-0 grid place-items-center text-white/70">Error header</div>
    ),
  },
};
