import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
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
});
