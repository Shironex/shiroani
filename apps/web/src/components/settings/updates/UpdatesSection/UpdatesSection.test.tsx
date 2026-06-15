import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { UpdatesSection } from './index';

describe('UpdatesSection', () => {
  it('renders the updates card title', () => {
    render(<UpdatesSection />);
    expect(screen.getByText('App version')).toBeInTheDocument();
  });
});
