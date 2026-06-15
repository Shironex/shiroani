import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import type { IDiscordPreviewProps } from '@/components/settings/DiscordPreview';
import { DiscordPreview } from '@/components/settings/DiscordPreview';

function renderPreview(overrides?: Partial<IDiscordPreviewProps>) {
  const props: IDiscordPreviewProps = {
    details: 'Watching One Piece',
    state: 'Episode 1000',
    showTimestamp: true,
    showLargeImage: true,
    showButton: true,
    activityType: 'watching',
    ...overrides,
  };
  return render(<DiscordPreview {...props} />);
}

describe('DiscordPreview', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the details and state lines', () => {
    renderPreview();
    expect(screen.getByText('Watching One Piece')).toBeInTheDocument();
    expect(screen.getByText('Episode 1000')).toBeInTheDocument();
  });

  it('always shows the ShiroAni app name and playing header', () => {
    renderPreview();
    expect(screen.getByText('ShiroAni')).toBeInTheDocument();
    expect(screen.getByText('Watching anime')).toBeInTheDocument();
  });

  it('shows the elapsed-time line when showTimestamp is true', () => {
    renderPreview({ showTimestamp: true });
    expect(screen.getByText('Elapsed 00:42:15')).toBeInTheDocument();
  });

  it('hides the elapsed-time line when showTimestamp is false', () => {
    renderPreview({ showTimestamp: false });
    expect(screen.queryByText('Elapsed 00:42:15')).not.toBeInTheDocument();
  });

  it('shows the AniList button for a watching activity when showButton is true', () => {
    renderPreview({ showButton: true, activityType: 'watching' });
    expect(screen.getByText('Show on AniList')).toBeInTheDocument();
  });

  it('hides the AniList button when showButton is false', () => {
    renderPreview({ showButton: false, activityType: 'watching' });
    expect(screen.queryByText('Show on AniList')).not.toBeInTheDocument();
  });

  it('hides the AniList button for a non-watching activity even when showButton is true', () => {
    renderPreview({ showButton: true, activityType: 'browsing' });
    expect(screen.queryByText('Show on AniList')).not.toBeInTheDocument();
  });

  it('shows the AniList button for the diary activity', () => {
    renderPreview({ showButton: true, activityType: 'diary' });
    expect(screen.getByText('Show on AniList')).toBeInTheDocument();
  });

  it('omits the state line when state is empty', () => {
    renderPreview({ state: '' });
    expect(screen.queryByText('Episode 1000')).not.toBeInTheDocument();
    // The details line is unaffected.
    expect(screen.getByText('Watching One Piece')).toBeInTheDocument();
  });
});
