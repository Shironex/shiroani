import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { mockUserProfile } from '../profile-fixtures';
import ProfileSidebar from './ProfileSidebar';

describe('ProfileSidebar', () => {
  it('renders the handle and summary stats', () => {
    render(
      <ProfileSidebar
        profile={mockUserProfile}
        isLoading={false}
        onRefresh={() => {}}
        onShare={() => {}}
        onDisconnect={() => {}}
      />
    );
    expect(screen.getByText('Yor')).toBeInTheDocument();
    expect(screen.getByText('@yor')).toBeInTheDocument();
    // 312 anime count, formatted with space grouping.
    expect(screen.getByText('312')).toBeInTheDocument();
  });
});
