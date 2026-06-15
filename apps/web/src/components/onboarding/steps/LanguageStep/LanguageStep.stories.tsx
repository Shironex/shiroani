import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import i18n from '@/lib/i18n';
import { withFullHeight } from '../../../../../.storybook/decorators';
import LanguageStep from './LanguageStep';

/**
 * Onboarding step 01 · Interface language. Renders a radiogroup of supported
 * languages (flag + label + active check) and switches i18next live on select,
 * persisting the choice. Reads the active language from the shared i18n
 * instance — no store seeding needed.
 */
const meta = {
  title: 'onboarding/steps/LanguageStep',
  component: LanguageStep,
  parameters: {
    layout: 'fullscreen',
    // Each option is a role="radio" with an accessible name inside a labelled
    // radiogroup; the flag SVGs are aria-hidden — axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
} satisfies Meta<typeof LanguageStep>;

export default meta;

type Story = StoryObj<typeof LanguageStep>;

/** Default — English active (the boot default), Polish selectable. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const radios = canvas.getAllByRole('radio');
    await expect(radios).toHaveLength(2);
    await expect(canvas.getByRole('radio', { name: /English/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  },
};

/**
 * Picking the inactive language flips the active radio live; restored to English
 * afterwards so sibling stories keep their default locale.
 */
export const SwitchesLanguage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    try {
      await userEvent.click(canvas.getByRole('radio', { name: /Polski|Polish/ }));
      await waitFor(() =>
        expect(canvas.getByRole('radio', { name: /Polski/ })).toHaveAttribute(
          'aria-checked',
          'true'
        )
      );
    } finally {
      await i18n.changeLanguage('en');
    }
  },
};
