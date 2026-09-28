import { ImportDialog } from '@/components/shared/ImportDialog';
import { ImageDropDialog } from '@/components/shared/ImageDropDialog';
import { DROP_ACTIVE_BODY_CLASS, useDropOverlay } from './DropOverlay.hooks';
import { DropOverlayPanel } from './DropOverlay.parts';

/**
 * Drops onto a `<webview>` go to the guest page, not the app. While the
 * overlay is up the guests stop taking pointer events so the drag stays here.
 */
const WEBVIEW_PASSTHROUGH_CSS = `body.${DROP_ACTIVE_BODY_CLASS} webview { pointer-events: none !important; }`;

/**
 * Handles anything dropped onto the app window: a web link opens in a browser
 * tab, a ShiroAni export opens the Import dialog prefilled, an image asks what
 * it should become. Mounted once at the app root.
 */
export default function DropOverlay() {
  const {
    preview,
    importContent,
    imageFile,
    showMascotOption,
    handleImportOpenChange,
    closeImageDialog,
  } = useDropOverlay();

  return (
    <>
      <style>{WEBVIEW_PASSTHROUGH_CSS}</style>
      {preview && <DropOverlayPanel preview={preview} />}
      <ImportDialog
        open={importContent !== null}
        onOpenChange={handleImportOpenChange}
        type="all"
        preloadedContent={importContent}
      />
      <ImageDropDialog
        file={imageFile}
        onClose={closeImageDialog}
        showMascotOption={showMascotOption}
      />
    </>
  );
}
