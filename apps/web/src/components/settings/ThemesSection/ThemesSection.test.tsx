import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { ThemesSection } from '.';

describe('ThemesSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the readability and palette cards', () => {
    expect(() => render(<ThemesSection />)).not.toThrow();
  });
});
