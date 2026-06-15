import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { NewTabPreview } from '.';

describe('NewTabPreview', () => {
  it('renders the preview stage', () => {
    render(<NewTabPreview label="Preview" />);
    expect(screen.getByTestId('newtab-preview')).toBeInTheDocument();
  });
});
