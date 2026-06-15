import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ThemeEditorDialog } from './index';

describe('ThemeEditorDialog', () => {
  it('renders the new-theme dialog title when open', () => {
    render(<ThemeEditorDialog open onOpenChange={() => {}} />);
    expect(screen.getByText('New theme')).toBeInTheDocument();
  });
});
