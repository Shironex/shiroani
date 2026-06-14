import { render, screen, within } from '@/test/test-utils';
import { vi } from 'vitest';
import { useQuickAccessStore } from '@/stores/useQuickAccessStore';
import { PREDEFINED_SITES } from '@/lib/quick-access-defaults';
import NewTabPage from './NewTabPage';

vi.mock('@/stores/useQuickAccessStore');

const mockAddSite = vi.fn();
const mockRemoveSite = vi.fn();
const mockHidePredefined = vi.fn();
const mockShowPredefined = vi.fn();

function setupMock(
  overrides: {
    sites?: { id: string; name: string; url: string; icon?: string }[];
    frequentSites?: {
      url: string;
      title: string;
      favicon?: string;
      visitCount: number;
      lastVisited: number;
    }[];
    hiddenPredefinedIds?: string[];
  } = {}
) {
  const state = {
    sites: overrides.sites ?? [],
    frequentSites: overrides.frequentSites ?? [],
    hiddenPredefinedIds: overrides.hiddenPredefinedIds ?? [],
    addSite: mockAddSite,
    removeSite: mockRemoveSite,
    hidePredefined: mockHidePredefined,
    showPredefined: mockShowPredefined,
  };

  // The component calls useQuickAccessStore(useShallow(selector)).
  // vi.mocked makes the mock call the selector with the state object.
  vi.mocked(useQuickAccessStore).mockImplementation((selector?: unknown) => {
    if (typeof selector === 'function') {
      return (selector as (s: typeof state) => unknown)(state);
    }
    return state;
  });

  // The component also calls useQuickAccessStore.getState()
  vi.mocked(useQuickAccessStore).getState = vi.fn().mockReturnValue(state);
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMock();
});

describe('NewTabPage', () => {
  it('renders "Quick access" section heading', () => {
    render(<NewTabPage onNavigate={vi.fn()} />);

    expect(screen.getByText('Quick access')).toBeInTheDocument();
  });

  it('renders all predefined site cards', () => {
    render(<NewTabPage onNavigate={vi.fn()} />);

    for (const site of PREDEFINED_SITES) {
      expect(screen.getByText(site.name)).toBeInTheDocument();
    }
  });

  it('calls onNavigate with the site URL when clicking a site card', async () => {
    const onNavigate = vi.fn();
    const { user } = render(<NewTabPage onNavigate={onNavigate} />);

    await user.click(screen.getByText('shinden.pl'));

    expect(onNavigate).toHaveBeenCalledWith('https://shinden.pl');
  });

  it('shows "Add" button that opens the add dialog', async () => {
    const { user } = render(<NewTabPage onNavigate={vi.fn()} />);

    await user.click(screen.getByText('Add'));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Add site')).toBeInTheDocument();
  });

  it('has submit button disabled when inputs are empty', async () => {
    const { user } = render(<NewTabPage onNavigate={vi.fn()} />);

    await user.click(screen.getByText('Add'));

    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getByRole('button', { name: 'Add' });
    expect(submitButton).toBeDisabled();
  });

  it('calls addSite when filling name and URL and submitting', async () => {
    const { user } = render(<NewTabPage onNavigate={vi.fn()} />);

    await user.click(screen.getByText('Add'));

    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByPlaceholderText('Name');
    const urlInput = within(dialog).getByPlaceholderText('https://example.com');

    await user.type(nameInput, 'Test Site');
    await user.type(urlInput, 'https://test.com');

    const submitButton = within(dialog).getByRole('button', { name: 'Add' });
    expect(submitButton).toBeEnabled();
    await user.click(submitButton);

    expect(mockAddSite).toHaveBeenCalledWith({
      name: 'Test Site',
      url: 'https://test.com',
      icon: 'https://www.google.com/s2/favicons?domain=test.com&sz=64',
    });
  });

  it('prepends https:// when URL lacks a protocol', async () => {
    const { user } = render(<NewTabPage onNavigate={vi.fn()} />);

    await user.click(screen.getByText('Add'));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByPlaceholderText('Name'), 'No Proto');
    await user.type(within(dialog).getByPlaceholderText('https://example.com'), 'example.org');
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));

    expect(mockAddSite).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.org' })
    );
  });

  it('calls hidePredefined when removing a predefined site card', async () => {
    const { user } = render(<NewTabPage onNavigate={vi.fn()} />);

    const removeButtons = screen.getAllByLabelText('Remove site');
    // The first remove button corresponds to the first predefined site
    await user.click(removeButtons[0]);

    expect(mockHidePredefined).toHaveBeenCalledWith(PREDEFINED_SITES[0].id);
  });

  it('calls removeSite when removing a custom site card', async () => {
    setupMock({
      sites: [{ id: 'custom-1', name: 'My Custom', url: 'https://custom.test' }],
    });

    const { user } = render(<NewTabPage onNavigate={vi.fn()} />);

    // Custom site is after predefined sites, so its remove button is last
    const removeButtons = screen.getAllByLabelText('Remove site');
    const lastRemoveButton = removeButtons[removeButtons.length - 1];
    await user.click(lastRemoveButton);

    expect(mockRemoveSite).toHaveBeenCalledWith('custom-1');
  });

  it('renders "Recently visited" section when frequentSites is non-empty', () => {
    setupMock({
      frequentSites: [
        { url: 'https://example.com', title: 'Example', visitCount: 5, lastVisited: Date.now() },
      ],
    });

    render(<NewTabPage onNavigate={vi.fn()} />);

    expect(screen.getByText('Recently visited')).toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('shows empty state in "Recently visited" when frequentSites is empty', () => {
    render(<NewTabPage onNavigate={vi.fn()} />);

    expect(screen.getByText('Recently visited')).toBeInTheDocument();
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });

  it('navigates when clicking a frequent site', async () => {
    const onNavigate = vi.fn();
    setupMock({
      frequentSites: [
        { url: 'https://frequent.test', title: 'Frequent', visitCount: 3, lastVisited: Date.now() },
      ],
    });

    const { user } = render(<NewTabPage onNavigate={onNavigate} />);

    await user.click(screen.getByText('Frequent'));

    expect(onNavigate).toHaveBeenCalledWith('https://frequent.test');
  });

  it('clicking the SVG inside the remove button fires onRemove and not onNavigate', async () => {
    const onNavigate = vi.fn();
    setupMock({
      sites: [{ id: 'custom-svg', name: 'SVG Test', url: 'https://svg.test' }],
    });

    const { user } = render(<NewTabPage onNavigate={onNavigate} />);

    const removeButtons = screen.getAllByLabelText('Remove site');
    const customRemoveBtn = removeButtons[removeButtons.length - 1];
    const svg = customRemoveBtn.querySelector('svg');
    expect(svg).not.toBeNull();
    await user.click(svg!);

    expect(mockRemoveSite).toHaveBeenCalledWith('custom-svg');
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
