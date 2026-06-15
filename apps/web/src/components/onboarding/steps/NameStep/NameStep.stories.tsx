import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, waitFor } from 'storybook/test';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import NameStep from './NameStep';

/**
 * Onboarding step 02 · Display name. A single labelled text field bound to the
 * settings store (`displayName`), with a live character counter capped at
 * `DISPLAY_NAME_MAX_LENGTH`. Local-only — the name never leaves the device.
 * Stories seed `useSettingsStore` so the field has a deterministic value.
 */
const meta = {
  title: 'onboarding/steps/NameStep',
  component: NameStep,
  parameters: {
    layout: 'fullscreen',
    // The text field carries an aria-label; the counter is decorative text —
    // axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useSettingsStore.setState({ displayName: '' });
  },
} satisfies Meta<typeof NameStep>;

export default meta;

type Story = StoryObj<typeof NameStep>;

/** Empty field showing the placeholder. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('textbox', { name: 'Your name' })).toHaveValue('');
  },
};

/** Typing flows through the settings store and back into the controlled field. */
export const TypesAName: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole('textbox', { name: 'Your name' });
    await userEvent.type(field, 'Mochi');
    await waitFor(() => expect(field).toHaveValue('Mochi'));
    await expect(useSettingsStore.getState().displayName).toBe('Mochi');
  },
};
