import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { DockSection } from '.';

describe('DockSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the dock position and behaviour cards', () => {
    expect(() => render(<DockSection />)).not.toThrow();
  });
});
