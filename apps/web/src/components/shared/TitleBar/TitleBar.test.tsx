import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';

// Force the non-mac branch so the real window-control buttons render.
vi.mock('@/lib/platform', () => ({ IS_ELECTRON: true, IS_MAC: false }));

// NotificationBell pulls in social stores/sockets — stub it to an inert marker
// so this suite stays focused on the title bar's own window controls.
vi.mock('@/components/social/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

import { TitleBar } from '@/components/shared/TitleBar';

const minimize = vi.fn();
const maximize = vi.fn();
const close = vi.fn();
const isMaximized = vi.fn(() => Promise.resolve(false));
const onMaximizedChange = vi.fn((_cb: (maximized: boolean) => void) => () => {});

beforeEach(() => {
  (window as unknown as { electronAPI: unknown }).electronAPI = {
    window: { minimize, maximize, close, isMaximized, onMaximizedChange },
  };
});

afterEach(() => {
  vi.clearAllMocks();
  delete (window as unknown as { electronAPI?: unknown }).electronAPI;
});

describe('TitleBar', () => {
  it('renders the wordmark and accessible window control buttons on non-mac platforms', () => {
    render(<TitleBar />);
    expect(screen.getByText('SHIROANI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Maximize' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('calls the minimize IPC when the minimize button is clicked', async () => {
    const { user } = render(<TitleBar />);
    await user.click(screen.getByRole('button', { name: 'Minimize' }));
    expect(minimize).toHaveBeenCalledTimes(1);
  });

  it('calls the maximize IPC when the maximize button is clicked', async () => {
    const { user } = render(<TitleBar />);
    await user.click(screen.getByRole('button', { name: 'Maximize' }));
    expect(maximize).toHaveBeenCalledTimes(1);
  });

  it('calls the close IPC when the close button is clicked', async () => {
    const { user } = render(<TitleBar />);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('shows the Restore label and reflects maximized state from the maximized-change listener', async () => {
    // Both the initial fetch and the change listener report "maximized" so the
    // two state setters agree (the async fetch resolves after the sync callback).
    isMaximized.mockResolvedValueOnce(true);
    onMaximizedChange.mockImplementation((cb: (v: boolean) => void) => {
      cb(true);
      return () => {};
    });
    render(<TitleBar />);
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Maximize' })).not.toBeInTheDocument();
  });

  it('renders the notification bell slot', () => {
    render(<TitleBar />);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });
});
