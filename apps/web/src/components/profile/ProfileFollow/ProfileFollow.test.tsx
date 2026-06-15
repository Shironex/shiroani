import { describe, expect, it, beforeEach } from 'vitest';
import { render } from '@/test/test-utils';
import { useAniListAuthStore } from '@/stores/useAniListAuthStore';
import ProfileFollow from './ProfileFollow';

const renderHead = (label: string) => <h3>{label}</h3>;

beforeEach(() => {
  useAniListAuthStore.setState(s => ({ status: { ...s.status, connected: false } }));
});

describe('ProfileFollow', () => {
  it('renders nothing when no AniList account is connected', () => {
    const { container } = render(<ProfileFollow renderHead={renderHead} />);
    expect(container).toBeEmptyDOMElement();
  });
});
