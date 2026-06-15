import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { NewTabSection } from '.';

describe('NewTabSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the new-tab customisation card', () => {
    expect(() => render(<NewTabSection />)).not.toThrow();
  });
});
