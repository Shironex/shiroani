/**
 * Main-process translation helper.
 *
 * The main process intentionally does NOT run `i18next`. Booting i18next here
 * would mean shipping the full namespaced JSON tree, the React-aware bundle,
 * and a parallel bootstrap path that has to stay in lockstep with the
 * renderer's. Main only owns ~10–15 strings (tray menu items, OS notification
 * fallback, Discord rich-presence states, file-picker dialog titles), so we
 * hand-maintain a tiny `Record<lang, …>` dictionary instead. This is the same
 * shape the landing page uses — proven low-overhead.
 *
 * The current UI language is read from `electron-store` at every `t()` call.
 * The renderer's `persistLanguage` mirrors `localStorage` into electron-store
 * under {@link UI_LANGUAGE_SETTING_KEY} (see `apps/web/src/lib/i18n.ts`), so
 * main always sees the latest value without IPC plumbing on the hot path.
 *
 * Tray menus are built once and cached, so a separate explicit rebuild is
 * required when the language flips at runtime — see `tray.ts#rebuildTrayMenu`.
 * OS notifications and Discord presence are emitted on demand and pick up the
 * new language on the next call automatically.
 */

import {
  DEFAULT_LANGUAGE,
  UI_LANGUAGE_SETTING_KEY,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@shiroani/shared';
import { store } from './store';
import { createMainLogger } from './logging/logger';

const logger = createMainLogger('i18n');

/**
 * The dictionary. Keys mirror renderer namespace conventions where it makes
 * sense (`tray`, `notification`, `discord`, `dialog`) but the file is
 * INTENTIONALLY independent of the renderer JSON — main translates a
 * different, much smaller surface, and coupling them via codegen would add
 * build complexity for no win.
 *
 * Add a new language by extending the literal — `satisfies` ensures every
 * locale carries every key.
 */
const strings = {
  en: {
    tray: {
      show: 'Show ShiroAni',
      quit: 'Quit',
    },
    browserMenu: {
      back: 'Back',
      forward: 'Forward',
      reload: 'Reload',
      cut: 'Cut',
      copy: 'Copy',
      paste: 'Paste',
      selectAll: 'Select all',
      copyLink: 'Copy link address',
      openLinkInNewTab: 'Open link in new tab',
      copyImage: 'Copy image',
      openImageInNewTab: 'Open image in new tab',
      inspect: 'Inspect element',
    },
    notification: {
      unknownAnime: 'Unknown anime',
      bodyAiringNow: 'Episode {{episode}} airing now!',
      bodyAiredAgo: 'Episode {{episode}} — aired {{minutes}} min ago',
      bodyInFuture: 'Episode {{episode}} in {{minutes}} min',
    },
    dialog: {
      selectSprite: 'Select mascot sprite',
      selectBackground: 'Select background image',
      imagesFilter: 'Images',
    },
    sprite: {
      notAValidImage: 'File is not a valid image',
      contentMismatchesExtension: "File contents don't match its extension",
      unsupportedFormat: 'Unsupported file format',
      tooLarge: 'File is too large (max 10 MB)',
      dimensionsTooLarge: 'Image is too large (max {{max}}×{{max}} px)',
      invalidDimensions: 'Image has invalid dimensions',
    },
    background: {
      unsupportedFormat: 'Unsupported file format',
      tooLarge: 'File is too large (max 20 MB)',
    },
    discord: {
      browsingLibrary: 'Browsing library',
      libraryCount: '{{count}} anime',
      writingDiary: 'Writing in diary',
      checkingSchedule: 'Checking schedule',
      configuringSettings: 'Configuring settings',
      watchingAnime: 'Watching anime',
      browsing: 'Browsing',
      usingApp: 'Using ShiroAni',
      buttonDownload: 'Download ShiroAni',
      buttonAniList: 'View on AniList',
      template: {
        watching: { details: 'Watching anime' },
        browsing: { details: 'Browsing' },
        library: { details: 'Browsing library' },
        diary: { details: 'Writing in diary' },
        schedule: { details: 'Checking schedule' },
        settings: { details: 'Configuring settings' },
        idle: { details: 'Idle' },
      },
      activityLabel: {
        watching: 'Watching anime',
        browsing: 'Browsing',
        library: 'Library',
        diary: 'Diary',
        schedule: 'Schedule',
        settings: 'Settings',
        idle: 'Idle',
      },
      templateVariable: {
        animeTitle: 'Anime title',
        episode: 'Episode number',
        siteName: 'Site name',
        libraryCount: 'Library count',
      },
    },
  },
  pl: {
    tray: {
      show: 'Pokaż ShiroAni',
      quit: 'Zakończ',
    },
    browserMenu: {
      back: 'Wstecz',
      forward: 'Do przodu',
      reload: 'Odśwież',
      cut: 'Wytnij',
      copy: 'Kopiuj',
      paste: 'Wklej',
      selectAll: 'Zaznacz wszystko',
      copyLink: 'Kopiuj adres linku',
      openLinkInNewTab: 'Otwórz link w nowej karcie',
      copyImage: 'Kopiuj obraz',
      openImageInNewTab: 'Otwórz obraz w nowej karcie',
      inspect: 'Zbadaj element',
    },
    notification: {
      unknownAnime: 'Nieznane anime',
      bodyAiringNow: 'Odcinek {{episode}} nadawany teraz!',
      bodyAiredAgo: 'Odcinek {{episode}} — nadawany {{minutes}} min temu',
      bodyInFuture: 'Odcinek {{episode}} za {{minutes}} min',
    },
    dialog: {
      selectSprite: 'Wybierz sprite maskotki',
      selectBackground: 'Wybierz obraz tła',
      imagesFilter: 'Obrazy',
    },
    sprite: {
      notAValidImage: 'Plik nie jest prawidłowym obrazem',
      contentMismatchesExtension: 'Zawartość pliku nie pasuje do rozszerzenia',
      unsupportedFormat: 'Nieobsługiwany format pliku',
      tooLarge: 'Plik jest za duży (maksymalnie 10 MB)',
      dimensionsTooLarge: 'Obraz jest za duży (maks. {{max}}×{{max}} px)',
      invalidDimensions: 'Obraz ma niepoprawne wymiary',
    },
    background: {
      unsupportedFormat: 'Nieobsługiwany format pliku',
      tooLarge: 'Plik jest za duży (maksymalnie 20 MB)',
    },
    discord: {
      browsingLibrary: 'Przeglądanie biblioteki',
      libraryCount: '{{count}} anime',
      writingDiary: 'Pisanie w dzienniku',
      checkingSchedule: 'Sprawdzanie harmonogramu',
      configuringSettings: 'Konfiguracja ustawień',
      watchingAnime: 'Ogląda anime',
      browsing: 'Przeglądanie',
      usingApp: 'Korzysta z ShiroAni',
      buttonDownload: 'Pobierz ShiroAni',
      buttonAniList: 'Pokaż na AniList',
      template: {
        watching: { details: 'Ogląda anime' },
        browsing: { details: 'Przeglądanie' },
        library: { details: 'Przeglądanie biblioteki' },
        diary: { details: 'Pisanie w dzienniku' },
        schedule: { details: 'Sprawdzanie harmonogramu' },
        settings: { details: 'Przeglądanie ustawień' },
        idle: { details: 'Oczekiwanie' },
      },
      activityLabel: {
        watching: 'Oglądanie anime',
        browsing: 'Przeglądanie',
        library: 'Biblioteka',
        diary: 'Dziennik',
        schedule: 'Harmonogram',
        settings: 'Ustawienia',
        idle: 'Bez aktywności',
      },
      templateVariable: {
        animeTitle: 'Tytuł anime',
        episode: 'Numer odcinka',
        siteName: 'Nazwa strony',
        libraryCount: 'Liczba anime w bibliotece',
      },
    },
  },
} as const satisfies Record<SupportedLanguage, MainStringsShape>;

/**
 * Shape constraint for the dictionary. Declared once off the EN tree so PL
 * (and any future language) is forced to provide the same keys.
 */
type MainStringsShape = {
  tray: { show: string; quit: string };
  browserMenu: {
    back: string;
    forward: string;
    reload: string;
    cut: string;
    copy: string;
    paste: string;
    selectAll: string;
    copyLink: string;
    openLinkInNewTab: string;
    copyImage: string;
    openImageInNewTab: string;
    inspect: string;
  };
  notification: {
    unknownAnime: string;
    bodyAiringNow: string;
    bodyAiredAgo: string;
    bodyInFuture: string;
  };
  dialog: { selectSprite: string; selectBackground: string; imagesFilter: string };
  sprite: {
    notAValidImage: string;
    contentMismatchesExtension: string;
    unsupportedFormat: string;
    tooLarge: string;
    dimensionsTooLarge: string;
    invalidDimensions: string;
  };
  background: {
    unsupportedFormat: string;
    tooLarge: string;
  };
  discord: {
    browsingLibrary: string;
    libraryCount: string;
    writingDiary: string;
    checkingSchedule: string;
    configuringSettings: string;
    watchingAnime: string;
    browsing: string;
    usingApp: string;
    buttonDownload: string;
    buttonAniList: string;
    template: {
      watching: { details: string };
      browsing: { details: string };
      library: { details: string };
      diary: { details: string };
      schedule: { details: string };
      settings: { details: string };
      idle: { details: string };
    };
    activityLabel: {
      watching: string;
      browsing: string;
      library: string;
      diary: string;
      schedule: string;
      settings: string;
      idle: string;
    };
    templateVariable: {
      animeTitle: string;
      episode: string;
      siteName: string;
      libraryCount: string;
    };
  };
};

type Strings = (typeof strings)[SupportedLanguage];

/**
 * Recursive dotted-key union for a nested string record. Yields keys like
 * `'tray.show' | 'notification.bodyAiredAgo' | …` so consumers get full
 * autocomplete on `t(…)`.
 */
type DotKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${DotKey<T[K]>}`
      : never;
}[keyof T & string];

export type MainTranslationKey = DotKey<Strings>;

/**
 * Read the current UI language from electron-store. Performed on every
 * {@link t} call — main has no equivalent of `i18next.language` and the
 * user can change the setting at any moment between two unrelated `t()`
 * sites (e.g. a Discord presence tick that fires while Settings is open).
 *
 * Falls back to {@link DEFAULT_LANGUAGE} on a missing or corrupt value.
 * `electron-store` reads are in-memory after first hydrate so the cost is
 * a single hashmap lookup — no caching needed.
 */
export function getCurrentLanguage(): SupportedLanguage {
  const raw = store.get(UI_LANGUAGE_SETTING_KEY);
  return isSupportedLanguage(raw) ? raw : DEFAULT_LANGUAGE;
}

/**
 * Walk a dotted path against a strings tree. Returns `undefined` if any
 * segment is missing or resolves to a non-string — the caller falls back
 * to EN before giving up.
 */
function resolveKey(tree: Strings, key: string): string | undefined {
  const segments = key.split('.');
  let cursor: unknown = tree;
  for (const segment of segments) {
    if (cursor && typeof cursor === 'object' && segment in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

/**
 * Substitute `{{name}}` placeholders. Missing params render as empty
 * strings so we never leak a literal `{{foo}}` to the user. Numbers are
 * coerced to strings so `t('…', { count: 12 })` works without the caller
 * stringifying first.
 */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = params[name];
    return value == null ? '' : String(value);
  });
}

/**
 * Translate a key for the current UI language. Falls back to
 * {@link DEFAULT_LANGUAGE} when the active locale is missing the key
 * (legitimate during a translation gap), and finally to the literal key
 * itself with a logged warning — runtime should never throw over a bad
 * key, but a noisy log surfaces the gap during development.
 */
export function t(key: MainTranslationKey, params?: Record<string, string | number>): string {
  const lang = getCurrentLanguage();
  const primary = resolveKey(strings[lang], key);
  const value = primary ?? resolveKey(strings[DEFAULT_LANGUAGE], key);

  if (value === undefined) {
    logger.warn(`Missing main-process translation key: "${key}"`);
    return key;
  }
  if (primary === undefined) {
    logger.warn(
      `Missing "${lang}" translation for key "${key}", falling back to ${DEFAULT_LANGUAGE}`
    );
  }

  return params ? interpolate(value, params) : value;
}
