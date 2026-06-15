import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { DockStage } from '@/components/shared/DockStage';

describe('DockStage', () => {
  it('renders the placeholder dots when no items are provided', () => {
    const { container } = render(<DockStage edge="bottom" />);
    // 4 placeholder slots, each a rounded slot span
    const slots = container.querySelectorAll('span.rounded-full');
    expect(slots.length).toBeGreaterThanOrEqual(4);
  });
});
