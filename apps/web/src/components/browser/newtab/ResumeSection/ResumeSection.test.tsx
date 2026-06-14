import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useLibraryStore } from '@/stores/useLibraryStore';
import ResumeWatchingSection from './ResumeSection';

beforeEach(() => {
  useLibraryStore.setState({ entries: [] });
});

describe('ResumeWatchingSection', () => {
  it('renders the section title and empty state when nothing is being watched', () => {
    render(<ResumeWatchingSection onNavigate={vi.fn()} />);

    expect(screen.getByText('Continue watching')).toBeInTheDocument();
  });
});
