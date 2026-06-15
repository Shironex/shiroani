import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useBrowserStore } from '@/stores/useBrowserStore';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import BrowserToolbar from './BrowserToolbar';

/**
 * Browser URL/navigation row: back / forward / reload icon buttons, the URL
 * input styled as a glass pill (a `role="combobox"` with a lock/globe leading
 * icon), and a trailing add-to-library / home / history cluster. The input owns
 * the smart-suggestions combobox; back/forward are disabled by
 * canGoBack/canGoForward and add-to-library by hasActiveTab.
 *
 * The address-suggestion hook reads `useBrowserStore.history` and the
 * quick-access store; stories seed both empty so the dropdown stays closed and
 * no listbox covers the toolbar when the a11y check runs.
 */
const meta = {
  title: 'browser/BrowserToolbar',
  component: BrowserToolbar,
  parameters: {
    // Icon nav buttons carry tooltips/labels and the URL input is labelled, so
    // axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    urlInput: { control: 'text', description: 'Controlled value of the address input.' },
    canGoBack: { control: 'boolean', description: 'Enables the Back button.' },
    canGoForward: { control: 'boolean', description: 'Enables the Forward button.' },
    isLoading: { control: 'boolean', description: 'Shows the spinner on the reload button.' },
    hasActiveTab: { control: 'boolean', description: 'Enables the add-to-library button.' },
    onNavigate: { description: 'Called with the trimmed target when the user submits a URL.' },
    onGoBack: { description: 'Back button handler.' },
    onGoForward: { description: 'Forward button handler.' },
    onReload: { description: 'Reload button handler.' },
    onGoHome: { description: 'Home button handler.' },
    onAddToLibrary: { description: 'Add-to-library button handler.' },
    onOpenHistory: { description: 'History button handler.' },
  },
  args: {
    urlInput: 'https://shinden.pl',
    onUrlInputChange: fn(),
    canGoBack: true,
    canGoForward: false,
    isLoading: false,
    hasActiveTab: true,
    onGoBack: fn(),
    onGoForward: fn(),
    onReload: fn(),
    onNavigate: fn(),
    onGoHome: fn(),
    onAddToLibrary: fn(),
    onOpenHistory: fn(),
  },
  beforeEach: () => {
    // Empty history + bookmarks → the suggestions listbox never opens.
    useBrowserStore.setState({ history: [] });
    useQuickAccessStore.setState({ sites: [], frequentSites: [], hiddenPredefinedIds: [] });
  },
} satisfies Meta<typeof BrowserToolbar>;

export default meta;

type Story = StoryObj<typeof BrowserToolbar>;

/** Resting toolbar: a secure URL, Back enabled, Forward disabled. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: 'Address bar' });
    await expect(input).toHaveValue('https://shinden.pl');
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Forward' })).toBeDisabled();

    // Reload / home / add-to-library report through their handlers.
    await userEvent.click(canvas.getByRole('button', { name: 'Reload' }));
    await expect(args.onReload).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Home' }));
    await expect(args.onGoHome).toHaveBeenCalledOnce();
    await userEvent.click(canvas.getByRole('button', { name: 'Add to library' }));
    await expect(args.onAddToLibrary).toHaveBeenCalledOnce();
  },
};

/** Submitting the address bar with Enter navigates to the trimmed value. */
export const Submit: Story = {
  args: { urlInput: '  https://youtube.com  ' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: 'Address bar' });
    await userEvent.click(input);
    await userEvent.keyboard('{Enter}');
    await expect(args.onNavigate).toHaveBeenCalledWith('https://youtube.com');
  },
};

/** Nothing navigable yet — Back/Forward disabled, no active tab. */
export const NoActiveTab: Story = {
  args: {
    urlInput: '',
    canGoBack: false,
    canGoForward: false,
    hasActiveTab: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Forward' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Add to library' })).toBeDisabled();
  },
};
