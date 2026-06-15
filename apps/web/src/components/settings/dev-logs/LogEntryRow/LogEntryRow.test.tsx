import { describe, expect, it, vi } from 'vitest';
import type { LogEntry } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { LogEntryRow } from './index';

const entry: LogEntry = {
  timestamp: '2026-01-01T12:00:00.000Z',
  level: 'info',
  context: 'Test',
  message: 'hello',
};

describe('LogEntryRow', () => {
  it('renders the level, message and context', () => {
    render(
      <ul>
        <LogEntryRow entry={entry} expanded={false} onToggle={() => {}} />
      </ul>
    );
    expect(screen.getByText('info')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('[Test]')).toBeInTheDocument();
  });

  it('renders the timestamp time portion', () => {
    render(
      <ul>
        <LogEntryRow entry={entry} expanded={false} onToggle={() => {}} />
      </ul>
    );
    expect(screen.getByText('12:00:00.000')).toBeInTheDocument();
  });

  it('shows no data toggle when the entry has no structured data', () => {
    render(
      <ul>
        <LogEntryRow entry={entry} expanded={false} onToggle={() => {}} />
      </ul>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('fires onToggle when the data toggle is clicked', async () => {
    const onToggle = vi.fn();
    const { user } = render(
      <ul>
        <LogEntryRow entry={{ ...entry, data: { id: 1 } }} expanded={false} onToggle={onToggle} />
      </ul>
    );
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('renders the pretty-printed data block when expanded', () => {
    render(
      <ul>
        <LogEntryRow entry={{ ...entry, data: { id: 7 } }} expanded onToggle={() => {}} />
      </ul>
    );
    expect(screen.getByText(/"id": 7/)).toBeInTheDocument();
  });
});
