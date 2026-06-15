import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { GeneralSection } from '.';

const mocks = vi.hoisted(() => ({
  persistLanguage: vi.fn(),
}));

vi.mock('@/lib/i18n', async () => {
  const actual = await vi.importActual<typeof import('@/lib/i18n')>('@/lib/i18n');
  return {
    ...actual,
    persistLanguage: mocks.persistLanguage,
  };
});

describe('GeneralSection — language picker', () => {
  beforeEach(async () => {
    mocks.persistLanguage.mockReset();
    await i18n.changeLanguage('en');
  });

  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders both supported languages as buttons', async () => {
    render(<GeneralSection />);
    expect(await screen.findByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Polski' })).toBeInTheDocument();
  });

  it('switching to Polski calls persistLanguage and changes i18n.language', async () => {
    const { user } = render(<GeneralSection />);
    const plButton = await screen.findByRole('button', { name: 'Polski' });
    await user.click(plButton);

    await waitFor(() => {
      expect(i18n.language).toBe('pl');
    });
    expect(mocks.persistLanguage).toHaveBeenCalledWith('pl');
  });

  it('switching back to English persists en and re-renders translated copy', async () => {
    await i18n.changeLanguage('pl');
    const { user } = render(<GeneralSection />);
    const enButton = await screen.findByRole('button', { name: 'English' });
    await user.click(enButton);

    await waitFor(() => {
      expect(i18n.language).toBe('en');
    });
    expect(mocks.persistLanguage).toHaveBeenCalledWith('en');
    // The card title comes from settings:app.languageTitle and should now
    // resolve in EN. Polish would render "Język", English "Language".
    expect(screen.getByText('Language')).toBeInTheDocument();
  });
});
