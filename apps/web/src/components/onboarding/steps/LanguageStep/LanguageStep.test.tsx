import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import LanguageStep from './LanguageStep';

describe('LanguageStep', () => {
  it('renders a language radio per supported language', () => {
    render(<LanguageStep />);

    expect(screen.getByRole('heading', { name: 'Interface language' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByText('English')).toBeInTheDocument();
  });
});
