import { describe, expect, it } from 'vitest';
import { Bookmark } from 'lucide-react';
import { render, screen } from '@/test/test-utils';
import PanelHeader from './PanelHeader';

describe('PanelHeader', () => {
  it('renders the title and meta', () => {
    render(<PanelHeader id="ph" icon={Bookmark} title="Quick access" meta="4 tabs" />);

    expect(screen.getByText('Quick access')).toBeInTheDocument();
    expect(screen.getByText('4 tabs')).toBeInTheDocument();
  });

  it('omits the meta slot when not provided', () => {
    render(<PanelHeader id="ph" icon={Bookmark} title="Recents" />);

    expect(screen.getByText('Recents')).toBeInTheDocument();
  });
});
