import { describe, expect, it } from 'vitest';
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
  it('renders the entry message and context', () => {
    render(
      <ul>
        <LogEntryRow entry={entry} expanded={false} onToggle={() => {}} />
      </ul>
    );
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('[Test]')).toBeInTheDocument();
  });
});
