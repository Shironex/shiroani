import type { Meta, StoryObj } from '@storybook/react-vite';
import BrowserToolbar from './BrowserToolbar';

const meta = {
  title: 'browser/BrowserToolbar',
  component: BrowserToolbar,
} satisfies Meta<typeof BrowserToolbar>;

export default meta;

type Story = StoryObj<typeof BrowserToolbar>;

export const Default: Story = {
  args: {
    urlInput: 'https://shinden.pl',
    onUrlInputChange: () => {},
    canGoBack: true,
    canGoForward: false,
    isLoading: false,
    hasActiveTab: true,
    onGoBack: () => {},
    onGoForward: () => {},
    onReload: () => {},
    onNavigate: () => {},
    onGoHome: () => {},
    onAddToLibrary: () => {},
    onOpenHistory: () => {},
  },
};
