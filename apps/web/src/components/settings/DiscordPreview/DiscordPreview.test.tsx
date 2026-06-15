import { describe, it, expect } from 'vitest';
import { render } from '@/test/test-utils';
import { DiscordPreview } from '@/components/settings/DiscordPreview';

describe('DiscordPreview', () => {
  it('renders without throwing', () => {
    render(
      <DiscordPreview
        details="Watching One Piece"
        state="Episode 1000"
        showTimestamp
        showLargeImage
        showButton
        activityType="watching"
      />
    );
    expect(document.body).toBeTruthy();
  });
});
