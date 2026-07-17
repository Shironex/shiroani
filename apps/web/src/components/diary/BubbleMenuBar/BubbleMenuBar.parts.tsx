import { FormatButton } from '../shared-parts';
import type { IBubbleButton } from './BubbleMenuBar.types';

/** A single formatting button in the bubble menu. */
export function BubbleButton({ button }: { button: IBubbleButton }) {
  const { Icon, label, active, toggle } = button;
  return (
    <FormatButton onClick={toggle} isActive={active} title={label}>
      <Icon className="w-3.5 h-3.5" />
    </FormatButton>
  );
}

/** The inline-mark formatting cluster (bold / italic / strike). */
export function FormattingButtons({ buttons }: { buttons: IBubbleButton[] }) {
  return (
    <>
      {buttons.map(button => (
        <BubbleButton key={button.key} button={button} />
      ))}
    </>
  );
}
