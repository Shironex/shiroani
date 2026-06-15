import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ColorPickerField } from '@/components/settings/ColorPickerField';

describe('ColorPickerField', () => {
  it('renders the field label', () => {
    render(
      <ColorPickerField
        label="Primary"
        variableName="primary"
        value="oklch(0.6 0.2 280)"
        onChange={() => {}}
      />
    );
    expect(screen.getByText('Primary')).toBeTruthy();
  });
});
