import { CloudOff } from 'lucide-react';
import { PreviewStage } from '@/components/shared/PreviewStage';

/** Destructive radial glow used by the error stage instead of the pink default. */
const ERROR_GLOW =
  'radial-gradient(circle at 50% 50%, oklch(0.55 0.18 25 / 0.22), transparent 60%)';

export function ErrorStage() {
  return (
    <PreviewStage height={140} border="bottom" glow={ERROR_GLOW}>
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative size-20">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-destructive/25 animate-ping"
            style={{ animationDuration: '2.4s' }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-2 rounded-full bg-destructive/20 animate-ping"
            style={{ animationDuration: '2.4s', animationDelay: '0.6s' }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <div className="size-14 rounded-full bg-destructive/20 border border-destructive/40 grid place-items-center shadow-[0_8px_24px_oklch(0.55_0.18_25_/_0.25)]">
              <CloudOff className="size-7 text-destructive" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
    </PreviewStage>
  );
}
