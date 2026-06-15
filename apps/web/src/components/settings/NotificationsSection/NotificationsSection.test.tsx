import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { NotificationsSection } from '.';

describe('NotificationsSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders without throwing when no electron API is present', () => {
    // Without window.electronAPI.notifications.getSettings, the hook marks the
    // section loaded synchronously, so the cards render in the test environment.
    expect(() => render(<NotificationsSection />)).not.toThrow();
  });
});
