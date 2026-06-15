import type { Meta, StoryObj } from '@storybook/react-vite';
import KanjiWatermark from './KanjiWatermark';

/**
 * A large decorative kanji glyph anchored to a corner behind a view's hero
 * section. Positioned absolutely and purely presentational (`pointer-events: none`,
 * `aria-hidden`), so it never enters the accessibility tree. Size, opacity and
 * which corner it sits in are all controllable via props.
 */
const meta = {
  title: 'shared/KanjiWatermark',
  component: KanjiWatermark,
  parameters: {
    // The glyph carries `data-a11y-decorative`, so it's excluded from the axe scan
    // (global a11y.context in .storybook/preview.tsx) — its intentionally faint,
    // aria-hidden text is decorative, not content. Everything else passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    kanji: { description: 'The glyph(s) to render as the watermark.' },
    position: {
      control: 'inline-radio',
      options: ['br', 'tr', 'bl', 'tl'],
      description: 'Which corner the glyph anchors to (default bottom-right).',
    },
    size: { control: 'number', description: 'Glyph size in px (default 220).' },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.01 },
      description: 'Glyph opacity (default 0.06).',
    },
  },
} satisfies Meta<typeof KanjiWatermark>;

export default meta;

type Story = StoryObj<typeof KanjiWatermark>;

/** Bottom-right anchor with a slightly raised opacity so the glyph is visible in docs. */
export const Default: Story = {
  args: { kanji: '影', position: 'br', size: 160, opacity: 0.12 },
};

/** Top-left anchor variant. */
export const TopLeft: Story = {
  args: { kanji: '夢', position: 'tl', size: 160, opacity: 0.12 },
};

/** Larger, fainter glyph closer to its real in-app usage. */
export const Subtle: Story = {
  args: { kanji: '物語', position: 'br', size: 220, opacity: 0.06 },
};
