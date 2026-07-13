import { create } from 'zustand';

/**
 * Per-pane webview load-error state, keyed by pane id (a BrowserNode leaf id).
 *
 * Kept separate from the persisted browser tree in `useBrowserStore`: a failed
 * load is ephemeral UI state, not something to serialize with the tab. The
 * webview-events hook writes here on a non-aborted `did-fail-load` and clears it
 * again the moment a fresh navigation starts or succeeds; the leaf renderer
 * subscribes to show a themed error overlay with a retry action.
 */
interface IWebviewErrorState {
  /** paneId → the Chromium `errorCode` of the last failed load. */
  errors: Record<string, number>;
  setError: (paneId: string, code: number) => void;
  clearError: (paneId: string) => void;
}

export const useWebviewErrorStore = create<IWebviewErrorState>(set => ({
  errors: {},
  setError: (paneId, code) =>
    set(state =>
      state.errors[paneId] === code ? state : { errors: { ...state.errors, [paneId]: code } }
    ),
  clearError: paneId =>
    set(state => {
      if (!(paneId in state.errors)) return state;
      const next = { ...state.errors };
      delete next[paneId];
      return { errors: next };
    }),
}));
