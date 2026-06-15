import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import type { DiaryEntry } from '@shiroani/shared';
import { withFullHeight } from '../../../../.storybook/decorators';
import { useDiaryStore } from '@/stores/useDiaryStore';
import DiaryView from './DiaryView';

const today = new Date().toISOString();

function makeEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 1,
    title: 'Season finale notes',
    contentJson: JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A great finish.' }] }],
    }),
    createdAt: today,
    updatedAt: today,
    isPinned: false,
    ...overrides,
  };
}

/**
 * Top-level Diary screen — `ViewHeader` (search, filters, sort, view-mode,
 * import/export, "New entry"), a two-column body (timeline/grid on the left,
 * the stat/streak `DiarySidebar` on the right), and the import/export/confirm
 * dialogs. When the editor is open it replaces the whole body in place.
 *
 * The view's mount effect calls `initListeners() + fetchEntries()`, and
 * `fetchEntries` ALWAYS emits the `diary:get-all` request (seeding entries does
 * not gate it). That emit opens the dormant preview socket, which then
 * reconnects forever against the dead test backend and pegs the headless
 * Chromium page until it crashes. Every story therefore stubs the three
 * socket-lifecycle actions to no-ops in `beforeEach` (the hook reads them from
 * the store, so `setState` swaps them) — no connection is ever attempted.
 */
const meta = {
  title: 'diary/DiaryView',
  component: DiaryView,
  parameters: {
    layout: 'fullscreen',
    // Header (h1), search/filter/sort controls, the timeline and the sidebar all
    // carry accessible names, and the empty-activity placeholder's title is an
    // <h2> (shared ComingSoonPlaceholder) so heading-order stays clean — every
    // a11y rule is enforced as an error.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useDiaryStore.setState({
      entries: [],
      activeFilter: 'all',
      searchQuery: '',
      viewMode: 'list',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      selectedEntry: null,
      isEditorOpen: false,
      isLoading: false,
      error: null,
      // Socket-free: the mount effect's fetch/listener calls become no-ops, so
      // the preview socket never connects.
      initListeners: fn(),
      fetchEntries: fn(),
      cleanupListeners: fn(),
    });
  },
} satisfies Meta<typeof DiaryView>;

export default meta;

type Story = StoryObj<typeof DiaryView>;

/**
 * Empty diary — a stable, non-loading, error-free state with no entries, so the
 * view renders its header and the "write your first entry" onboarding CTA.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Diary' })).toBeInTheDocument();
    await expect(canvas.getByText('Your diary is still empty')).toBeInTheDocument();
  },
};

/** Loading — the skeleton rail is shown while the initial fetch is in flight. */
export const Loading: Story = {
  beforeEach: () => {
    useDiaryStore.setState({ isLoading: true });
  },
};

/**
 * Failed initial fetch — shows the "couldn't load" retry CTA, NOT the empty
 * onboarding CTA, because the entries aren't gone.
 */
export const LoadError: Story = {
  beforeEach: () => {
    useDiaryStore.setState({ error: 'network down' });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Couldn't load your diary")).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    // The onboarding CTA must NOT appear on a load error.
    await expect(canvas.queryByText('Your diary is still empty')).not.toBeInTheDocument();
  },
};

/** Populated — entries grouped by day in the timeline, with the stat sidebar. */
export const Populated: Story = {
  beforeEach: () => {
    useDiaryStore.setState({
      entries: [
        makeEntry({ id: 1, title: 'Pinned thoughts', isPinned: true, tags: ['anime'] }),
        makeEntry({ id: 2, title: 'A quiet episode' }),
      ],
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Pinned thoughts')).toBeInTheDocument();
    await expect(canvas.getByText('A quiet episode')).toBeInTheDocument();
  },
};

/**
 * Search with no matches — distinct from the empty diary: shows the "no
 * results" hint instead of the onboarding CTA.
 */
export const NoSearchResults: Story = {
  beforeEach: () => {
    useDiaryStore.setState({
      entries: [makeEntry({ id: 1, title: 'Something' })],
      searchQuery: 'zzz-no-such-title',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText('No results')).toBeInTheDocument());
  },
};

/**
 * Opening the editor replaces the diary body in place (no modal) — the "New
 * entry" button flips the store's editor flag and the editor region renders.
 */
export const OpenEditor: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'New entry' }));
    await waitFor(() => expect(useDiaryStore.getState().isEditorOpen).toBe(true));
    await expect(
      await canvas.findByRole('region', { name: 'New diary entry' })
    ).toBeInTheDocument();
  },
};
