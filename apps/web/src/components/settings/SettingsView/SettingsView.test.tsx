import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SettingsView } from './index';

describe('SettingsView', () => {
  it('renders the section navigation tablist', () => {
    render(<SettingsView />);
    expect(screen.getByRole('tablist', { name: 'Settings sections' })).toBeInTheDocument();
  });

  it('renders a tab for each section group', () => {
    render(<SettingsView />);
    expect(screen.getByRole('tab', { name: 'Themes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'About' })).toBeInTheDocument();
  });

  it('selecting a tab marks it selected and swaps the panel', async () => {
    const { user } = render(<SettingsView />);
    const aboutTab = screen.getByRole('tab', { name: 'About' });
    await user.click(aboutTab);
    expect(aboutTab).toHaveAttribute('aria-selected', 'true');
    // The About panel renders its "Story" card heading.
    expect(screen.getByRole('heading', { name: 'Story' })).toBeInTheDocument();
  });
});
