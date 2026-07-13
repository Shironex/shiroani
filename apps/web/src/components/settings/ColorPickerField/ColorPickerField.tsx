import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useColorPickerField } from './ColorPickerField.hooks';
import type { IColorPickerFieldProps } from './ColorPickerField.types';

export default function ColorPickerField(props: IColorPickerFieldProps) {
  const { t } = useTranslation('settings');
  const { label, variableName, value } = props;
  const { colorInputRef, hexValue, localHex, handleHexChange, handleColorPickerChange } =
    useColorPickerField(props);

  // Flag the typed hex only when it cannot become valid with more typing — i.e.
  // it is not a prefix of any parseable form (#rgb / #rrggbb / #rrggbbaa).
  // In-progress values like "#ff00" stay quiet; a wrong character (or a missing
  // "#") is surfaced immediately on the input border, via aria-invalid, and as a
  // short alert line below.
  const invalid = localHex !== '' && !/^#[0-9a-fA-F]{0,8}$/.test(localHex);
  const errorId = `${variableName}-hex-error`;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {/* The visible swatch is the single focusable control; it triggers the
          hidden native color input, kept as a sibling (not nested) so the two
          interactive elements never wrap one another. */}
      <div className="relative w-7 h-7 shrink-0">
        <button
          type="button"
          className="w-7 h-7 rounded-md border border-border-glass cursor-pointer shadow-sm transition-transform active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          style={{ backgroundColor: hexValue }}
          onClick={() => colorInputRef.current?.click()}
          aria-label={t('colorPicker.pickAria', { label })}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={hexValue}
          onChange={handleColorPickerChange}
          aria-label={t('colorPicker.pickAria', { label })}
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
            aria-label={t('colorPicker.hexAria', { label })}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            className={cn(
              'h-6 w-20 px-1.5 text-2xs font-mono shrink-0',
              invalid && 'border-destructive'
            )}
          />
        </div>
        {invalid ? (
          <span
            id={errorId}
            role="alert"
            className="text-[10px] font-medium text-destructive truncate"
          >
            {t('colorPicker.invalidHex')}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/80 font-mono truncate">
            {variableName}: {value}
          </span>
        )}
      </div>
    </div>
  );
}
