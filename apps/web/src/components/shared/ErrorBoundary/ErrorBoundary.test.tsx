import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <span>healthy child</span>
      </ErrorBoundary>
    );
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('renders the fallback when a child throws', () => {
    // Silence React's expected error logging for this render
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    // The fallback exposes a technical-details disclosure with the error message
    expect(screen.getByText('boom')).toBeInTheDocument();
  });
});
