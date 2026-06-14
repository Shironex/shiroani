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

  it('renders close and retry buttons on error', () => {
    render(<SplashFooter {...baseProps} variant="error" error="network unreachable" />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
