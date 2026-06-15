import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { SettingsView } from './index';

describe('SettingsView', () => {
  it('renders the section navigation tablist', () => {
    render(<SettingsView />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
