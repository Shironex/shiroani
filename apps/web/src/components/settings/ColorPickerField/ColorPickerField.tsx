import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useColorPickerField } from './ColorPickerField.hooks';
import type { IColorPickerFieldProps } from './ColorPickerField.types';

export default function ColorPickerField(props: IColorPickerFieldProps) {
  const { label, variableName, value } = props;
  const { colorInputRef, hexValue, localHex, handleHexChange, handleColorPickerChange } =
    useColorPickerField(props);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* The visible swatch is the single focusable control; it triggers the
          hidden native color input, kept as a sibling (not nested) so the two
          interactive elements never wrap one another. */}
      <div className="relative w-7 h-7 shrink-0">
        <button
          type="button"
          className="w-7 h-7 rounded-md border border-border-glass cursor-pointer shadow-sm"
          style={{ backgroundColor: hexValue }}
          onClick={() => colorInputRef.current?.click()}
          aria-label={`Wybierz kolor: ${label}`}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={hexValue}
          onChange={handleColorPickerChange}
          aria-label={`Wybierz kolor: ${label}`}
          aria-hidden="true"
          className="sr-only"
          tabIndex={-1}
        />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-foreground truncate">{label}</span>
          <Input
            value={localHex}
            onChange={handleHexChange}
            aria-label={`Kod heksadecymalny: ${label}`}
            className={cn(
              'h-6 w-20 px-1.5 text-2xs font-mono shrink-0',
              localHex !== hexValue && localHex.length >= 4 && 'border-destructive'
            )}
          />
        </div>
        <span className="text-[10px] text-muted-foreground/60 font-mono truncate">
          {variableName}: {value}
        </span>
      </div>
    </div>
  );
}
