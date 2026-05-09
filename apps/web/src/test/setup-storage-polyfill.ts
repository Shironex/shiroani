/**
 * Side-effect polyfill that restores jsdom's working `localStorage` and
 * `sessionStorage` onto `globalThis` (and `window`, which is the same
 * object under vitest's jsdom env) before any test code reads them.
 *
 * Why this is necessary
 * ---------------------
 * Node 25 ships an experimental `localStorage` / `sessionStorage` stub on
 * `globalThis`. Without `--localstorage-file=<path>` the API exists as an
 * unusable empty object that emits
 *   `Warning: --localstorage-file was provided without a valid path`
 * on access.
 *
 * Vitest 4.1.5's jsdom env then leaks that stub through. Its
 * `populateGlobal` only re-installs Window keys that exist on `global`
 * when those keys are in its `LIVING_KEYS` / `OTHER_KEYS` allowlist;
 * `localStorage` and `sessionStorage` are NOT in that allowlist, so
 * jsdom's working `Storage` is dropped and Node's broken stub wins.
 *
 * `apps/web/src/lib/i18n.ts` reads `window.localStorage.getItem(...)`
 * synchronously at module load (it has to — i18next must boot before
 * React mounts to avoid first-paint flash). With the broken stub, that
 * read throws `TypeError: window.localStorage.getItem is not a function`
 * inside vitest's setup phase, aborting every suite before any test runs.
 *
 * Node 22 (the project's `engines.node` pin and the version CI uses) is
 * not affected. This polyfill exists only to keep the suite runnable on
 * Node 25 dev machines.
 *
 * Detection
 * ---------
 * The polyfill replaces the current `localStorage` / `sessionStorage`
 * binding with the jsdom impl whenever the existing value is missing a
 * working `getItem` method. That covers both the Node 25 empty-object
 * stub (`{}`) and any future variant that leaves the API non-functional.
 *
 * Source of the working impl: vitest's jsdom env exposes the underlying
 * JSDOM instance as `globalThis.jsdom` (see vitest 4.x dist chunk
 * `index.DC7d2Pf8.js`, jsdom env `setup`: `global.jsdom = dom`). Its
 * `dom.window.localStorage` is the WHATWG Storage that tests expect.
 */

declare global {
  var jsdom: { window: Window & typeof globalThis } | undefined;
}

function isBrokenStorage(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== 'object') return true;
  // Node 25's stub is a plain `{}` with no Storage methods.
  return typeof (value as Storage).getItem !== 'function';
}

const jsdomWindow = globalThis.jsdom?.window;

if (jsdomWindow) {
  if (isBrokenStorage((globalThis as { localStorage?: unknown }).localStorage)) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      enumerable: true,
      get: () => jsdomWindow.localStorage,
      set: () => {
        // Storage is intentionally read-only here; mutate via setItem/clear.
      },
    });
  }
  if (isBrokenStorage((globalThis as { sessionStorage?: unknown }).sessionStorage)) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      enumerable: true,
      get: () => jsdomWindow.sessionStorage,
      set: () => {
        // Storage is intentionally read-only here; mutate via setItem/clear.
      },
    });
  }
}

export {};
