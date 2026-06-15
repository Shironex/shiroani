import { beforeEach, describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { MascotSection } from '.';

describe('MascotSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders without throwing when the overlay API is absent', () => {
    // No window.electronAPI.overlay in the test env, so the section stays in
    // its loaded-with-defaults state and renders the mascot card.
    expect(() => render(<MascotSection />)).not.toThrow();
  });
});
