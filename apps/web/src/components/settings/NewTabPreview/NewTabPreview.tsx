import { useTranslation } from 'react-i18next';
import { PreviewStage } from '@/components/shared/PreviewStage';
import { useNewTabPreview } from './NewTabPreview.hooks';
import { buildRows } from './NewTabPreview.parts';
import type { INewTabPreviewProps } from './NewTabPreview.types';

/**
 * Miniature, deterministic preview of the browser New Tab page that reacts in
 * real time to the store: panel visibility, drag order, watermark, greeting
 * name and the airing-card count. Mirrors the gridded-gradient stage idiom of
 * `MascotPreview`/`DockStage` so the preview language stays consistent across
 * settings sections. Renders synthetic skeleton shapes — never live data — so
 * it stays cheap and predictable.
 *
 * Layout intentionally mirrors `NewTabPage`: Quick Access + Recents collapse
 * into a paired two-column row (Quick Access wider, Recents narrower) when both
 * are visible and adjacent in the order; otherwise each panel is full-width.
 */
export default function NewTabPreview(props: INewTabPreviewProps) {
  const { label } = props;
  const { t } = useTranslation('settings');
  const { order, hiddenPanels, showWatermark, showGreetingName, airingCount } =
    useNewTabPreview(props);

  const rows = buildRows({ order, hiddenPanels, showGreetingName, airingCount });

  return (
    <PreviewStage data-testid="newtab-preview" heightClassName="h-[220px]" label={label}>
      {showWatermark && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-4 -right-1 select-none font-serif text-[88px] font-extrabold leading-none text-foreground/[0.05]"
        >
          網
        </span>
      )}

      {rows.length === 0 ? (
        <div className="relative grid h-full place-items-center px-6">
          <p className="text-center text-[11.5px] font-medium text-muted-foreground/80">
            {t('newtab.preview.allHidden')}
          </p>
        </div>
      ) : (
        <div className="relative flex h-full flex-col gap-1.5 overflow-hidden p-3">{rows}</div>
      )}
    </PreviewStage>
  );
}
