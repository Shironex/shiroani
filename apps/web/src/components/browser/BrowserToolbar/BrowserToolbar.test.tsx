import { render, screen } from '@/test/test-utils';
import { vi } from 'vitest';
import i18n from '@/lib/i18n';
import BrowserToolbar from './BrowserToolbar';

const mockSetAddressBarFocused = vi.fn();

vi.mock('@/stores/useBrowserStore', () => {
  const useBrowserStore = (() => undefined) as unknown as {
    (selector: unknown): unknown;
    getState: () => { setAddressBarFocused: typeof mockSetAddressBarFocused };
  };
  useBrowserStore.getState = () => ({ setAddressBarFocused: mockSetAddressBarFocused });
  return { useBrowserStore };
});

// The smart address bar pulls suggestions from multiple stores; stub it out so
// these toolbar tests stay focused on the navigation chrome.
vi.mock('@/components/browser/useAddressSuggestions', () => ({
  useAddressSuggestions: () => [],
}));

function getDefaultProps() {
  return {
    urlInput: '',
    onUrlInputChange: vi.fn(),
    canGoBack: false,
    canGoForward: false,
    isLoading: false,
    hasActiveTab: true,
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
    onReload: vi.fn(),
    onNavigate: vi.fn(),
    onGoHome: vi.fn(),
    onAddToLibrary: vi.fn(),
    onOpenHistory: vi.fn(),
  };
}

// Button order in the redesigned toolbar (Browser.html `.urlbar`):
// 0: Back (Wstecz)
// 1: Forward (Dalej)
// 2: Reload (Odśwież)
// 3: Add to library (Dodaj do biblioteki)
// 4: Home (Strona główna)

function getButtons() {
  const buttons = screen.getAllByRole('button');
  return {
    back: buttons[0],
    forward: buttons[1],
    reload: buttons[2],
    addToLibrary: buttons[3],
    home: buttons[4],
  };
}

function getUrlInput() {
  // Resolve through i18n so the assertion follows the active locale's
  // source of truth (EN under the test setup) instead of pinning to a
  // hardcoded copy string.
  return screen.getByPlaceholderText(i18n.t('browser:urlBar.placeholder'));
}

describe('BrowserToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('navigation buttons', () => {
    it('disables back button when canGoBack is false', () => {
      render(<BrowserToolbar {...getDefaultProps()} canGoBack={false} />);
      expect(getButtons().back).toBeDisabled();
    });

    it('enables back button when canGoBack is true', () => {
      render(<BrowserToolbar {...getDefaultProps()} canGoBack={true} />);
      expect(getButtons().back).toBeEnabled();
    });

    it('disables forward button when canGoForward is false', () => {
      render(<BrowserToolbar {...getDefaultProps()} canGoForward={false} />);
      expect(getButtons().forward).toBeDisabled();
    });

    it('enables forward button when canGoForward is true', () => {
      render(<BrowserToolbar {...getDefaultProps()} canGoForward={true} />);
      expect(getButtons().forward).toBeEnabled();
    });

    it('calls onGoBack when back button is clicked', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} canGoBack={true} />);
      await user.click(getButtons().back);
      expect(props.onGoBack).toHaveBeenCalledOnce();
    });

    it('calls onGoForward when forward button is clicked', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} canGoForward={true} />);
      await user.click(getButtons().forward);
      expect(props.onGoForward).toHaveBeenCalledOnce();
    });
  });

  describe('URL input', () => {
    it('displays the urlInput value', () => {
      render(<BrowserToolbar {...getDefaultProps()} urlInput="https://example.com" />);
      expect(getUrlInput()).toHaveValue('https://example.com');
    });

    it('calls onUrlInputChange when typing', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} />);
      await user.type(getUrlInput(), 'a');
      expect(props.onUrlInputChange).toHaveBeenCalledWith('a');
    });

    it('calls onNavigate with trimmed URL on Enter', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} urlInput="  https://example.com  " />);
      await user.type(getUrlInput(), '{Enter}');
      expect(props.onNavigate).toHaveBeenCalledWith('https://example.com');
    });

    it('does not call onNavigate on Enter when input is empty', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} urlInput="" />);
      await user.type(getUrlInput(), '{Enter}');
      expect(props.onNavigate).not.toHaveBeenCalled();
    });

    it('does not call onNavigate on Enter when input is only whitespace', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} urlInput="   " />);
      await user.type(getUrlInput(), '{Enter}');
      expect(props.onNavigate).not.toHaveBeenCalled();
    });

    it('calls setAddressBarFocused(true) on focus', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} />);
      await user.click(getUrlInput());
      expect(mockSetAddressBarFocused).toHaveBeenCalledWith(true);
    });

    it('calls setAddressBarFocused(false) on blur', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} />);
      await user.click(getUrlInput());
      await user.tab();
      expect(mockSetAddressBarFocused).toHaveBeenCalledWith(false);
    });
  });

  describe('reload button', () => {
    it('calls onReload when clicked', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} />);
      await user.click(getButtons().reload);
      expect(props.onReload).toHaveBeenCalledOnce();
    });
  });

  describe('home button', () => {
    it('calls onGoHome when clicked', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} />);
      await user.click(getButtons().home);
      expect(props.onGoHome).toHaveBeenCalledOnce();
    });
  });

  describe('add to library button', () => {
    it('is disabled when hasActiveTab is false', () => {
      render(<BrowserToolbar {...getDefaultProps()} hasActiveTab={false} />);
      expect(getButtons().addToLibrary).toBeDisabled();
    });

    it('is enabled when hasActiveTab is true', () => {
      render(<BrowserToolbar {...getDefaultProps()} hasActiveTab={true} />);
      expect(getButtons().addToLibrary).toBeEnabled();
    });

    it('calls onAddToLibrary when clicked', async () => {
      const props = getDefaultProps();
      const { user } = render(<BrowserToolbar {...props} hasActiveTab={true} />);
      await user.click(getButtons().addToLibrary);
      expect(props.onAddToLibrary).toHaveBeenCalledOnce();
    });
  });
});
