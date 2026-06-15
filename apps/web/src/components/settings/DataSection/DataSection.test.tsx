import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import { DataSection } from '.';

describe('DataSection', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the export, import and danger-zone cards', () => {
    render(<DataSection />);
    expect(screen.getByRole('heading', { name: 'Export data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Import data' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delete all data' })).toBeInTheDocument();
  });
});
