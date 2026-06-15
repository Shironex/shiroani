import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import * as i18nLib from '@/lib/i18n';
import LanguageStep from './LanguageStep';

afterEach(async () => {
  vi.restoreAllMocks();
  // Other suites assert EN copy; restore the default after we flip the language.
  if (i18n.language !== 'en') await i18n.changeLanguage('en');
});

describe('LanguageStep', () => {
  it('renders a radio per supported language and marks the active one checked', () => {
    render(<LanguageStep />);

    expect(screen.getByRole('heading', { name: 'Interface language' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    // Default boot language is EN (DEFAULT_LANGUAGE), so English is checked.
    expect(screen.getByRole('radio', { name: /English/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Polski|Polish/ })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('switches language live and persists the choice when a new option is picked', async () => {
    const persistSpy = vi.spyOn(i18nLib, 'persistLanguage').mockImplementation(() => {});
    const { user } = render(<LanguageStep />);

    await user.click(screen.getByRole('radio', { name: /Polski|Polish/ }));

    await waitFor(() => expect(i18n.language).toBe('pl'));
    expect(persistSpy).toHaveBeenCalledWith('pl');
  });

  it('ignores a click on the already-active language (no redundant persist)', async () => {
    const persistSpy = vi.spyOn(i18nLib, 'persistLanguage').mockImplementation(() => {});
    const { user } = render(<LanguageStep />);

    await user.click(screen.getByRole('radio', { name: /English/ }));

    expect(persistSpy).not.toHaveBeenCalled();
    expect(i18n.language).toBe('en');
  });
});
