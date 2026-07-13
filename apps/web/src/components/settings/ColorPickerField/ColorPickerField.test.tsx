import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { render, screen } from '@/test/test-utils';
import { hexToOklch } from '@/lib/color-utils';
import { ColorPickerField } from '@/components/settings/ColorPickerField';

const VALUE = 'oklch(0.6 0.2 280)';

function setup(overrides?: Partial<Parameters<typeof ColorPickerField>[0]>) {
  const onChange = vi.fn();
  const utils = render(
    <ColorPickerField
      label="Primary"
      variableName="primary"
      value={VALUE}
      onChange={onChange}
      {...overrides}
    />
  );
  return { onChange, ...utils };
}

describe('ColorPickerField', () => {
  it('renders the field label and the oklch variable line', () => {
    setup();
    expect(screen.getByText('Primary')).toBeInTheDocument();
    // The variable name + oklch value render as a mono caption.
    expect(screen.getByText(`primary: ${VALUE}`)).toBeInTheDocument();
  });

  it('reflects the current value as a hex string in the text input', () => {
    setup();
    const hexInput = screen.getByRole('textbox', { name: 'Hex code: Primary' });
    // The oklch value is converted to hex for display.
    expect((hexInput as HTMLInputElement).value).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('typing a valid hex value fires onChange with the converted oklch', async () => {
    const { onChange, user } = setup();
    const hexInput = screen.getByRole('textbox', { name: 'Hex code: Primary' });
    await user.clear(hexInput);
    await user.type(hexInput, '#ff0000');
    expect(onChange).toHaveBeenLastCalledWith(hexToOklch('#ff0000'));
  });

  it('does not fire onChange while the typed hex is incomplete/invalid', async () => {
    const { onChange, user } = setup();
    const hexInput = screen.getByRole('textbox', { name: 'Hex code: Primary' });
    await user.clear(hexInput);
    await user.type(hexInput, '#ff');
    // '#ff' is not a complete hex color, so no oklch is emitted.
    expect(onChange).not.toHaveBeenCalled();
    // The partial value is still shown in the field.
    expect((hexInput as HTMLInputElement).value).toBe('#ff');
  });

  it('changing the native color input fires onChange with the converted oklch', () => {
    const { onChange } = setup();
    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeTruthy();
    // jsdom does not open a picker; fireEvent.change updates React's value
    // tracker so the synthetic onChange fires.
    fireEvent.change(colorInput, { target: { value: '#00ff00' } });
    expect(onChange).toHaveBeenCalledWith(hexToOklch('#00ff00'));
  });

  it('clicking the swatch button opens the hidden native color input', async () => {
    const { user } = setup();
    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(colorInput, 'click');
    await user.click(screen.getByRole('button', { name: 'Pick color: Primary' }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exposes accessible names for both the swatch button and the hex input', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Pick color: Primary' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Hex code: Primary' })).toBeInTheDocument();
  });
});
