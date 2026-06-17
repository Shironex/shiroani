import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import type { BrowserFavorite } from '@shiroani/shared';
import { useBrowserStore } from '@/stores/useBrowserStore';
import BrowserFavoritesBar from './BrowserFavoritesBar';

function fav(id: string, title: string, url: string): BrowserFavorite {
  return { id, title, url, createdAt: 1 };
}

const favorites: BrowserFavorite[] = [
  fav('f1', 'Shinden', 'https://shinden.pl'),
  fav('f2', 'YouTube', 'https://youtube.com'),
  fav('f3', 'AniList', 'https://anilist.co'),
];

/**
 * Favorites bar under the toolbar: a row of favicon + title chips. Left-click
 * navigates the active tab, Ctrl/middle-click opens a new tab, and the kebab /
 * right-click opens a menu (open in new tab, rename, remove). Reads the
 * `favorites` + `favoritesBarVisible` slices of `useBrowserStore`, which each
 * story seeds. The context menu and rename dialog portal to `document.body`.
 */
const meta = {
  title: 'browser/BrowserFavoritesBar',
  component: BrowserFavoritesBar,
  parameters: {
    // The menu + rename dialog portal to body — render Docs in an iframe so
    // overlays/scroll-lock stay inside the preview block.
    docs: { story: { inline: false, iframeHeight: 320 } },
    // Bar is a labelled nav, chips are named buttons, the kebab has an
    // aria-label, and the menu is a labelled role="menu" — axe passes clean.
    a11y: { test: 'error' },
  },
  argTypes: {
    onNavigate: { description: 'Navigate the active tab to a favorite.' },
    onOpenInNewTab: { description: 'Open a favorite in a new tab.' },
  },
  args: {
    onNavigate: fn(),
    onOpenInNewTab: fn(),
  },
} satisfies Meta<typeof BrowserFavoritesBar>;

export default meta;

type Story = StoryObj<typeof BrowserFavoritesBar>;

/** Populated bar — clicking a chip navigates the active tab. */
export const Default: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ favorites, favoritesBarVisible: true });
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Shinden')).toBeInTheDocument();

    await userEvent.click(canvas.getByText('AniList'));
    await expect(args.onNavigate).toHaveBeenCalledWith('https://anilist.co');
  },
};

/** Right-click / kebab opens the actions menu. */
export const ContextMenu: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ favorites, favoritesBarVisible: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    const kebab = canvas.getAllByRole('button', { name: /options/i })[0];
    await userEvent.click(kebab);

    const menu = await body.findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: /open in new tab/i })).toBeVisible();
    await expect(within(menu).getByRole('menuitem', { name: /rename/i })).toBeVisible();
    await expect(within(menu).getByRole('menuitem', { name: /remove/i })).toBeVisible();
  },
};

/** Choosing "Rename" opens a dialog seeded with the current title. */
export const Rename: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ favorites, favoritesBarVisible: true });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    await userEvent.click(canvas.getAllByRole('button', { name: /options/i })[1]);
    await userEvent.click(
      within(await body.findByRole('menu')).getByRole('menuitem', { name: /rename/i })
    );

    const dialog = await body.findByRole('dialog');
    await expect(within(dialog).getByDisplayValue('YouTube')).toBeInTheDocument();
  },
};

/** Hidden via the visibility toggle — the bar renders nothing. */
export const Hidden: Story = {
  beforeEach: () => {
    useBrowserStore.setState({ favorites, favoritesBarVisible: false });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('navigation')).not.toBeInTheDocument();
  },
};
