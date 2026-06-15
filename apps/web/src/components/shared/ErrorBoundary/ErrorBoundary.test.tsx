import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error to console.error during the failing render;
    // silence the expected noise so the suite output stays clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

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

  it('renders the fallback UI (kicker, description, recovery buttons) when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    // EN copy from the errorBoundary namespace.
    expect(screen.getByText('something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred\. Try going back/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart app' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('exposes the thrown message behind the technical-details disclosure', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('Technical details')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('clears the error and re-renders children when "Try again" is clicked', async () => {
    let crash = true;
    function Maybe() {
      if (crash) throw new Error('boom');
      return <span>recovered child</span>;
    }
    const { user } = render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>
    );
    expect(screen.getByText('something went wrong')).toBeInTheDocument();

    // Heal the child before retrying so the boundary's reset reveals it.
    crash = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('recovered child')).toBeInTheDocument();
    expect(screen.queryByText('something went wrong')).not.toBeInTheDocument();
  });

  it('recovers automatically when a resetKey changes after an error', () => {
    let crash = true;
    function Maybe() {
      if (crash) throw new Error('boom');
      return <span>recovered via resetKeys</span>;
    }
    const { rerender } = render(
      <ErrorBoundary resetKeys={['view-a']}>
        <Maybe />
      </ErrorBoundary>
    );
    expect(screen.getByText('something went wrong')).toBeInTheDocument();

    crash = false;
    rerender(
      <ErrorBoundary resetKeys={['view-b']}>
        <Maybe />
      </ErrorBoundary>
    );
    expect(screen.getByText('recovered via resetKeys')).toBeInTheDocument();
  });

  it('gives the fallback mascot image an accessible alt text', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByAltText('ShiroAni mascot — sleeping')).toBeInTheDocument();
  });
});
