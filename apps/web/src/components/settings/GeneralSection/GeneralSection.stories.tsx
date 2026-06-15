import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { useSettingsStore } from '@/stores/useSettingsStore';
import i18n from '@/lib/i18n';
import GeneralSection from './GeneralSection';

/**
 * Settings · General section. Bundles the app language picker, the display-name
 * field (read/written through `useSettingsStore`), and the app toggles
 * (launch-at-startup and RSS-refresh-on-startup, read/written through the
 * electron bridge). In Storybook there is no electron bridge, so the toggles
 * load to their defaults and stay off. A restart-hint callout closes the
 * section.
 */
const meta = {
  title: 'settings/GeneralSection',
  component: GeneralSection,
  parameters: {
    // The language buttons, the name input (aria-labelledby), and the toggles
    // all carry accessible names, so axe passes clean.
    a11y: { test: 'error' },
  },
  beforeEach: async () => {
    await i18n.changeLanguage('en');
    useSettingsStore.setState({ displayName: '' });
  },
} satisfies Meta<typeof GeneralSection>;

export default meta;

type Story = StoryObj<typeof GeneralSection>;

export const Default: Story = {};

/** Both supported languages render as buttons; the active one is highlighted. */
export const LanguagePicker: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'English' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Polski' })).toBeInTheDocument();
  },
};

/** Typing into the name field writes through the settings store. */
export const EditsName: Story = {
  beforeEach: async () => {
    await i18n.changeLanguage('en');
    const setDisplayName = fn();
    useSettingsStore.setState({ displayName: '', setDisplayName });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByRole('textbox', { name: 'Your name' });
    await userEvent.type(input, 'Anya');
    await waitFor(() =>
      expect(useSettingsStore.getState().setDisplayName).toHaveBeenCalledWith('A')
    );
  },
};
