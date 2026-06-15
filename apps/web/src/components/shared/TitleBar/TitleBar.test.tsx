import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';

vi.mock('@/lib/platform', () => ({ IS_ELECTRON: false, IS_MAC: false }));

import { TitleBar } from '@/components/shared/TitleBar';

describe('TitleBar', () => {
  it('renders the wordmark and window control buttons on non-mac platforms', () => {
    render(<TitleBar />);
    expect(screen.getByText('SHIROANI')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimize')).toBeInTheDocument();
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});
