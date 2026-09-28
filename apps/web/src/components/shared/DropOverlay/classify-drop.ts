/**
 * Pure classification of what was dragged onto or dropped on the window.
 * Kept free of React and DOM globals so every branch is unit tested; the
 * inputs are the structural parts of `DataTransfer` the logic needs.
 */

/** The parts of a dropped `File` the classifier reads. */
export interface IDroppedFileLike {
  readonly name: string;
  readonly type: string;
  readonly size: number;
}

/** The parts of a drop event's `DataTransfer` the classifier reads. */
export interface IDropDataLike<F extends IDroppedFileLike = IDroppedFileLike> {
  readonly files: ArrayLike<F>;
  readonly types: readonly string[];
  getData(format: string): string;
}

/** The parts of a `DataTransfer` readable while a drag is still in progress. */
export interface IDragDataLike {
  readonly types: readonly string[];
  readonly items?: ArrayLike<{ readonly kind: string; readonly type: string }>;
}

export type UnsupportedDropReason = 'empty' | 'multiple' | 'file-type' | 'text';

export type DropClassification<F extends IDroppedFileLike = IDroppedFileLike> =
  | { kind: 'link'; url: string }
  | { kind: 'json'; file: F }
  | { kind: 'image'; file: F }
  | { kind: 'unsupported'; reason: UnsupportedDropReason };

/** What the overlay announces while the drag is in progress. */
export type DragPreview = 'link' | 'json' | 'image' | 'unknown' | 'unsupported';

/**
 * Largest `.json` file read from a drop. Checked before `file.text()` so a
 * huge file is never pulled into memory; far above a large real export.
 */
export const MAX_IMPORT_JSON_BYTES = 50 * 1024 * 1024;

/** Image types both the background and the sprite pickers accept. */
const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp']);
const JSON_MIME_TYPES = new Set(['application/json', 'text/json']);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * An image is recognised by its MIME type, or by its extension when the OS
 * reports no MIME type. Main checks the real file signature afterwards.
 */
function isImageFile(file: IDroppedFileLike): boolean {
  if (file.type) return IMAGE_MIME_TYPES.has(file.type);
  return IMAGE_EXTENSIONS.has(extensionOf(file.name));
}

/** A ShiroAni export is a `.json` file whose MIME type, if any, is JSON. */
function isJsonFile(file: IDroppedFileLike): boolean {
  if (extensionOf(file.name) !== 'json') return false;
  return file.type === '' || JSON_MIME_TYPES.has(file.type);
}

/**
 * Accept only absolute `http:` / `https:` URLs. Everything else
 * (`javascript:`, `file:`, `data:`, `shiroani:`, plain text) is rejected.
 * Returns the normalised URL or null.
 */
export function parseWebLink(text: string): string | null {
  const candidate = text.trim();
  if (!candidate || /\s/.test(candidate)) return null;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
}

/** First entry of a `text/uri-list` payload (RFC 2483: `#` lines are comments). */
export function firstUriListEntry(uriList: string): string | null {
  for (const line of uriList.split(/\r?\n/)) {
    const entry = line.trim();
    if (entry && !entry.startsWith('#')) return entry;
  }
  return null;
}

/**
 * Decide what a drop means. Files win over text (dragging an image out of a
 * web page carries both). One file only; a link comes from `text/uri-list`
 * when present, otherwise from `text/plain`.
 */
export function classifyDrop<F extends IDroppedFileLike>(
  data: IDropDataLike<F>
): DropClassification<F> {
  if (data.files.length > 1) return { kind: 'unsupported', reason: 'multiple' };

  if (data.files.length === 1) {
    const file = data.files[0];
    if (isJsonFile(file)) return { kind: 'json', file };
    if (isImageFile(file)) return { kind: 'image', file };
    return { kind: 'unsupported', reason: 'file-type' };
  }

  const uriList = data.types.includes('text/uri-list') ? data.getData('text/uri-list') : '';
  const text = uriList
    ? (firstUriListEntry(uriList) ?? '')
    : data.types.includes('text/plain')
      ? data.getData('text/plain')
      : '';

  if (!text.trim()) return { kind: 'unsupported', reason: 'empty' };

  const url = parseWebLink(text);
  return url ? { kind: 'link', url } : { kind: 'unsupported', reason: 'text' };
}

/**
 * Best guess while dragging. Browsers hide file names and text contents until
 * the drop, so this reads only the declared kinds and MIME types.
 */
export function previewDrag(data: IDragDataLike): DragPreview {
  const fileItems = Array.from(data.items ?? []).filter(item => item.kind === 'file');

  if (fileItems.length > 1) return 'unsupported';
  if (fileItems.length === 1) {
    const { type } = fileItems[0];
    if (IMAGE_MIME_TYPES.has(type)) return 'image';
    if (JSON_MIME_TYPES.has(type)) return 'json';
    return type ? 'unsupported' : 'unknown';
  }

  if (data.types.includes('Files')) return 'unknown';
  if (data.types.includes('text/uri-list')) return 'link';
  if (data.types.includes('text/plain')) return 'unknown';
  return 'unsupported';
}
