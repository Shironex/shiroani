import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ThemeEditorDialog } from './index';

describe('ThemeEditorDialog', () => {
  it('renders the new-theme dialog title when open', () => {
    render(<ThemeEditorDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'New theme' })).toBeInTheDocument();
  });

  it('renders the edit-theme title when editing an existing theme', () => {
    render(<ThemeEditorDialog open editThemeId="some-id" onOpenChange={() => {}} />);
    expect(screen.getByText('Edit theme')).toBeInTheDocument();
  });

  it('renders the variable groups with a known color field', () => {
    render(<ThemeEditorDialog open onOpenChange={() => {}} />);
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('requests close via onOpenChange when cancelled', async () => {
    const onOpenChange = vi.fn();
    const { user } = render(<ThemeEditorDialog open onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('saves and closes when a name is present', async () => {
    const onOpenChange = vi.fn();
    const { user } = render(<ThemeEditorDialog open onOpenChange={onOpenChange} />);
    // The new-theme flow pre-fills a default name, so Save proceeds and closes.
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
