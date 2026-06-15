import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { mockUserProfile } from '../profile-fixtures';
import ProfileShareDialog from './ProfileShareDialog';

describe('ProfileShareDialog', () => {
  it('renders nothing while closed and does not kick off the card render', () => {
    // Closed: the render effect early-returns, so no canvas work runs in jsdom.
    const { baseElement } = render(
      <ProfileShareDialog open={false} onOpenChange={() => {}} profile={mockUserProfile} />
    );
    expect(baseElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('portals the dialog title and export actions when open', () => {
    render(<ProfileShareDialog open onOpenChange={vi.fn()} profile={mockUserProfile} />);
    // Dialog content portals to document.body; queries reach it via screen.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Share profile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy to clipboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save as png/i })).toBeInTheDocument();
  });
});
