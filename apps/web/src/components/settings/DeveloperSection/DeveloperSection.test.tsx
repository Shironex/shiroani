import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { DeveloperSection } from '.';

describe('DeveloperSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the developer tools card', () => {
    expect(() => render(<DeveloperSection />)).not.toThrow();
  });
});
