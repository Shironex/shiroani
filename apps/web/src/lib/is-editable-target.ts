/**
 * Whether an event target is a text-editing surface that should swallow global
 * keyboard shortcuts — an `<input>`, `<textarea>`, or any `contenteditable`
 * element. Used by global keydown handlers to avoid hijacking keys while the
 * user is typing. Returns `false` for non-element targets (including `null`).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}
