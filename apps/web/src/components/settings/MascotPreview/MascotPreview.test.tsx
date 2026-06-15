import { describe, expect, it } from 'vitest';
import { render } from '@/test/test-utils';
import { MascotPreview } from '.';

describe('MascotPreview', () => {
  it('renders the three chibi anchors without throwing', () => {
    expect(() =>
      render(<MascotPreview current={128} min={48} max={256} label="Preview" />)
    ).not.toThrow();
  });
});
