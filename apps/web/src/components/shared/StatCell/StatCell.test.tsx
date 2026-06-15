import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { StatCell } from '@/components/shared/StatCell';

describe('StatCell', () => {
  it('renders the label, value and optional sub descriptor', () => {
    render(<StatCell label="Watched" value={184} sub="of 220" />);
    expect(screen.getByText('Watched')).toBeInTheDocument();
    expect(screen.getByText('184')).toBeInTheDocument();
    expect(screen.getByText('of 220')).toBeInTheDocument();
  });

  it('omits the sub descriptor when not provided', () => {
    render(<StatCell label="Watched" value={184} />);
    expect(screen.getByText('184')).toBeInTheDocument();
    expect(screen.queryByText('of 220')).not.toBeInTheDocument();
  });

  it('renders the label using the canonical mono-uppercase token', () => {
    render(<StatCell label="Mean score" value="8.4" />);
    const label = screen.getByText('Mean score');
    expect(label).toHaveClass('font-mono', 'uppercase');
  });

  it('uses the extrabold sans value style by default', () => {
    render(<StatCell label="Watched" value={184} />);
    const value = screen.getByText('184');
    expect(value).toHaveClass('font-extrabold');
    expect(value).not.toHaveClass('font-serif');
  });

  it('switches the value to the serif style when serif is set', () => {
    render(<StatCell label="Mean score" value="8.4" serif />);
    const value = screen.getByText('8.4');
    expect(value).toHaveClass('font-serif', 'font-bold');
    expect(value).not.toHaveClass('font-extrabold');
  });

  it('renders a ReactNode value, not just text', () => {
    render(<StatCell label="Status" value={<em data-testid="rich">Live</em>} />);
    expect(screen.getByTestId('rich')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders a zero value (does not treat 0 as empty)', () => {
    render(<StatCell label="Dropped" value={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders a ReactNode sub descriptor', () => {
    render(<StatCell label="Watched" value={184} sub={<small data-testid="sub">/ 220</small>} />);
    expect(screen.getByTestId('sub')).toBeInTheDocument();
  });

  it('handles long label and value text without dropping content', () => {
    const longValue = '1 234 567 890';
    render(<StatCell label="Total minutes watched across all years" value={longValue} />);
    expect(screen.getByText('Total minutes watched across all years')).toBeInTheDocument();
    expect(screen.getByText(longValue)).toBeInTheDocument();
  });

  it('forwards extra props and merges a caller className onto the root', () => {
    render(<StatCell label="Watched" value={184} className="custom-cell" data-testid="cell" />);
    const root = screen.getByTestId('cell');
    expect(root).toHaveClass('custom-cell', 'flex', 'flex-col');
  });
});
