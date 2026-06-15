import { describe, it, expect } from 'vitest';
import { render } from '@/test/test-utils';
import { DiscordSection } from '@/components/settings/DiscordSection';

describe('DiscordSection', () => {
  it('renders without throwing when no settings are available', () => {
    // Without electronAPI, the section hydrates no settings and returns null.
    render(<DiscordSection />);
    expect(document.body).toBeTruthy();
  });
});
