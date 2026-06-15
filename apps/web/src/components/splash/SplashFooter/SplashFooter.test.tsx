import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SplashFooter from './SplashFooter';

const baseProps = {
  showSpinner: true,
  message: 'Shiro-chan is stretching~ nyaa...',
  messageKey: 0,
  progressValue: null,
  version: '0.5.2',
  metaRight: null,
  error: null,
  onRetry: vi.fn(),
  onClose: vi.fn(),
};

describe('SplashFooter', () => {
  it('renders the rotating prose message for the loading variant', () => {
    render(<SplashFooter {...baseProps} variant="loading" />);
    expect(screen.getByText('Shiro-chan is stretching~ nyaa...')).toBeInTheDocument();
  });

  it('exposes the footer as a polite live status region', () => {
    render(<SplashFooter {...baseProps} variant="loading" />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('falls back to the version when no metaRight is given', () => {
    render(<SplashFooter {...baseProps} variant="loading" />);
    expect(screen.getByText('v0.5.2')).toBeInTheDocument();
  });

  it('prefers an explicit metaRight over the version', () => {
    render(<SplashFooter {...baseProps} variant="updating" metaRight="restarting..." />);
    expect(screen.getByText('restarting...')).toBeInTheDocument();
    expect(screen.queryByText('v0.5.2')).not.toBeInTheDocument();
  });

  it('renders the structured status row when statusText is provided', () => {
    render(
      <SplashFooter
        {...baseProps}
        variant="updating"
        statusText={{ action: 'Installing', target: 'v0.6.0' }}
      />
    );
    expect(screen.getByText(/Installing/)).toBeInTheDocument();
    expect(screen.getByText('v0.6.0')).toBeInTheDocument();
    // Structured status replaces the rotating prose.
    expect(screen.queryByText('Shiro-chan is stretching~ nyaa...')).not.toBeInTheDocument();
  });

  it('renders a determinate progress bar when a value is given', () => {
    render(<SplashFooter {...baseProps} variant="loading" progressValue={42} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('renders close and retry buttons on error', () => {
    render(<SplashFooter {...baseProps} variant="error" error="network unreachable" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('hides the progress bar on error', () => {
    render(<SplashFooter {...baseProps} variant="error" error="network unreachable" />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('treats a truthy error prop as the error state even on the loading variant', () => {
    render(<SplashFooter {...baseProps} variant="loading" error="boom" />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('invokes onClose and onRetry when the error buttons are clicked', async () => {
    const onClose = vi.fn();
    const onRetry = vi.fn();
    const { user } = render(
      <SplashFooter
        {...baseProps}
        variant="error"
        error="network unreachable"
        onClose={onClose}
        onRetry={onRetry}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
