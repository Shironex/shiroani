/**
 * Shared changelog data — single source of truth consumed by:
 *   - `apps/web` (in-app `ChangelogView`, via `apps/web/src/lib/changelog-entries.ts`)
 *   - `apps/landing` (marketing changelog page, via `apps/landing/src/lib/releases.ts`)
 *
 * ## Bilingual structure
 *
 * Every release carries both Polish (`pl`) and English (`en`) copy. The
 * locale-neutral fields — `version`, `shortDate`, `type`, `latest` and each
 * category's `kind` — live on the `Release` object directly. Everything that
 * is language-specific (the human-readable `date`, `title`, `description` and
 * the localized `categories` array of `{ kind, label, entries }`) lives under
 * `release.pl` / `release.en` (`LocalizedRelease`).
 *
 * Consumers pick a locale with {@link localizeRelease} (or read `r.pl` / `r.en`
 * directly): the landing page threads its SSR `lang` through, the in-app view
 * follows the active i18next language.
 *
 * ## Authoring rule for new releases
 *
 * The GitHub release notes are deliberately technical (file names, IPC, PR
 * numbers, backoff timings). The changelog here is the opposite — short,
 * friendly, **non-technical**, written for end users. When adding a release:
 *
 *   1. Write the PL copy first (the canonical tone reference).
 *   2. Translate it to natural English for `en` — same number of categories,
 *      roughly the same number of bullets, the same tone. Don't paste the GH
 *      notes verbatim; use them only to disambiguate *what* changed.
 *   3. Translate category `label`s too ("Poprawki" → "Fixes", "Nowe funkcje"
 *      → "New features", "Stabilność i porządki" → "Stability & cleanup", …).
 *   4. Give `date` an English long form ("2 maja 2026" → "May 2, 2026").
 *
 * Pure data only. No React / lucide / CSS — consumers map `category.kind` to
 * their own presentation layer (PillTag variants in web, lucide icons in
 * landing). After editing, re-run `pnpm --filter @shiroani/changelog build` so
 * the symlinked `dist/` updates.
 */

export type CategoryKind =
  | 'feature'
  | 'fix'
  | 'polish'
  | 'security'
  | 'feed'
  | 'macos'
  | 'app'
  | 'bot';

export type Locale = 'pl' | 'en';

export interface LocalizedCategory {
  kind: CategoryKind;
  /** Uppercase label shown next to the entry list (localized). */
  label: string;
  /** Bullet list of user-facing changes (localized). Plain strings only — keep copy non-technical. */
  entries: string[];
}

/**
 * Back-compat alias. The in-app adapter imports `Category` — keep it pointing
 * at the localized shape so consumers don't break.
 */
export type Category = LocalizedCategory;

/** Language-specific half of a release. */
export interface LocalizedRelease {
  /** Localized human-readable date (e.g. PL `2 maja 2026`, EN `May 2, 2026`). */
  date: string;
  /** One-liner headline. */
  title: string;
  /** One-paragraph summary visible above the category lists. */
  description: string;
  /** Localized category lists. `kind` stays shared; `label`/`entries` are translated. */
  categories: LocalizedCategory[];
}

export type ReleaseType = 'major' | 'minor';

export interface Release {
  /** Dotted version without the leading `v` (e.g. `0.5.0`). Locale-neutral. */
  version: string;
  /** Short machine date used in the left rail (e.g. `13.04.2026`). Locale-neutral. */
  shortDate: string;
  /** Used by the top filter chips to split major/minor releases. Locale-neutral. */
  type: ReleaseType;
  /** True for the topmost release — gets a solid dot and a "Najnowsza"/"Latest" badge. */
  latest?: boolean;
  /** Polish copy. */
  pl: LocalizedRelease;
  /** English copy. */
  en: LocalizedRelease;
}

/** A release flattened to a single locale — what most UI code wants. */
export interface ResolvedRelease {
  version: string;
  shortDate: string;
  type: ReleaseType;
  latest?: boolean;
  date: string;
  title: string;
  description: string;
  categories: LocalizedCategory[];
}

/**
 * Flatten a {@link Release} to one locale, merging the locale-neutral fields
 * with `release[locale]`. Returned categories/entries are fresh arrays so
 * callers can safely sort/slice them.
 */
export function localizeRelease(release: Release, locale: Locale): ResolvedRelease {
  const loc = release[locale];
  return {
    version: release.version,
    shortDate: release.shortDate,
    type: release.type,
    ...(release.latest ? { latest: true } : {}),
    date: loc.date,
    title: loc.title,
    description: loc.description,
    categories: loc.categories.map(c => ({
      kind: c.kind,
      label: c.label,
      entries: [...c.entries],
    })),
  };
}

/** Convenience: localize the whole list at once. */
export function localizeReleases(locale: Locale): ResolvedRelease[] {
  return RELEASES.map(r => localizeRelease(r, locale));
}

export const RELEASES: readonly Release[] = [
  {
    version: '1.0.0',
    shortDate: '10.06.2026',
    type: 'major',
    latest: true,
    pl: {
      date: '10 czerwca 2026',
      title: 'ShiroAni 1.0 — pierwsza stabilna wersja',
      description:
        'ShiroAni wychodzi z fazy beta. To pierwsze wydanie 1.0 — przeglądarka, biblioteka, śledzenie postępów i odkrywanie są gotowe do codziennego użytku. Integracje z AniList i MyAnimeList pozostają eksperymentalne. Przed tą wersją cały kod przeszedł pełny audyt, więc całość jest stabilniejsza, szybsza i bardziej niezawodna.',
      categories: [
        {
          kind: 'feature',
          label: 'Kamień milowy 1.0',
          entries: [
            'ShiroAni wychodzi z fazy beta — to pierwsza stabilna wersja',
            'Integracje z AniList i MyAnimeList wciąż są eksperymentalne, reszta aplikacji jest gotowa do codziennego użytku',
          ],
        },
        {
          kind: 'polish',
          label: 'Płynność i wygląd',
          entries: [
            'Płynniejsze przewijanie w sekcji Odkrywaj',
            'Czytelne stany ładowania i błędów w bibliotece, dzienniku i profilu MyAnimeList',
            'Dopracowana strona z odświeżonym wyglądem',
          ],
        },
        {
          kind: 'fix',
          label: 'Stabilność i niezawodność',
          entries: [
            'Pełny audyt kodu — dziesiątki poprawek odporności pod maską',
            'Bardziej niezawodny import i eksport biblioteki (lepsze dopasowywanie, brak duplikatów)',
            'Synchronizacja MyAnimeList nie nadpisuje już oceny przy drobnym zaokrągleniu',
            'Pewniejsze migracje bazy danych i dokładniejsze logi',
          ],
        },
        {
          kind: 'security',
          label: 'Bezpieczeństwo',
          entries: ['Aktualizacja zależności usuwająca znane podatności'],
        },
      ],
    },
    en: {
      date: 'June 10, 2026',
      title: 'ShiroAni 1.0 — the first stable release',
      description:
        'ShiroAni leaves beta. This is the first 1.0 release — the browser, library, progress tracking and discovery are ready for everyday use. The AniList and MyAnimeList integrations stay experimental. Ahead of this release the whole codebase went through a full audit, so everything is more stable, faster and more reliable.',
      categories: [
        {
          kind: 'feature',
          label: 'The 1.0 milestone',
          entries: [
            'ShiroAni leaves beta — this is the first stable release',
            'AniList and MyAnimeList integrations are still experimental; the rest of the app is ready for daily use',
          ],
        },
        {
          kind: 'polish',
          label: 'Smoothness & looks',
          entries: [
            'Smoother scrolling in Discover',
            'Clear loading and error states in the library, diary and MyAnimeList profile',
            'Polished website with a refreshed look',
          ],
        },
        {
          kind: 'fix',
          label: 'Stability & reliability',
          entries: [
            'A full codebase audit — dozens of robustness fixes under the hood',
            'More reliable library import/export (better matching, no duplicates)',
            'MyAnimeList sync no longer overwrites your score on minor rounding',
            'Sturdier database migrations and more accurate logs',
          ],
        },
        {
          kind: 'security',
          label: 'Security',
          entries: ['Dependency updates clearing known vulnerabilities'],
        },
      ],
    },
  },
  {
    version: '0.13.0',
    shortDate: '08.06.2026',
    type: 'minor',
    pl: {
      date: '8 czerwca 2026',
      title: 'Konta AniList i MyAnimeList — logowanie i dwukierunkowa synchronizacja biblioteki',
      description:
        'Największa nowość tej wersji: można teraz połączyć konto AniList i MyAnimeList i synchronizować swoją bibliotekę w obie strony — z wyborem kierunku (import, wysyłka albo pełna synchronizacja). To funkcje eksperymentalne, wciąż w trakcie testów, więc mogą zdarzyć się drobne usterki. Do tego profil pokazuje statystyki z MyAnimeList, biblioteka działa płynniej i radzi sobie z wieloma pozycjami naraz.',
      categories: [
        {
          kind: 'feature',
          label: 'Konta i synchronizacja (eksperymentalne)',
          entries: [
            'Logowanie do AniList i MyAnimeList prosto w aplikacji',
            'Dwukierunkowa synchronizacja biblioteki — zmiany płyną w obie strony',
            'Wybór kierunku: tylko import, tylko wysyłka albo pełna synchronizacja',
            'Pozycje z MyAnimeList są automatycznie dopasowywane do AniList',
          ],
        },
        {
          kind: 'feature',
          label: 'Profil',
          entries: [
            'Statystyki z MyAnimeList z pierścieniami i podziałem czasu oglądania',
            'Układ zakładki MyAnimeList dopasowany do panelu AniList',
            'Linki do profili AniList i MyAnimeList otwierają się we wbudowanej przeglądarce',
          ],
        },
        {
          kind: 'feature',
          label: 'Biblioteka',
          entries: [
            'Zaznaczanie wielu pozycji i akcje zbiorcze — status, ocena i usuwanie naraz',
            'Linki do AniList i MyAnimeList otwierają się w aplikacji',
            'Płynniejsze przewijanie dużych bibliotek (widok siatki i listy)',
          ],
        },
        {
          kind: 'fix',
          label: 'Stabilność i poprawki',
          entries: [
            'Wiele poprawek odporności logowania i synchronizacji — pomijanie nieaktualnych odpowiedzi oraz walidacja danych konta i tokenów',
            'Liczba dni „czasu oglądania" z MyAnimeList jest poprawnie odmieniana',
            'Przyciski w paskach narzędzi pozostają kwadratowe w ciasnych nagłówkach',
          ],
        },
      ],
    },
    en: {
      date: 'June 8, 2026',
      title: 'AniList & MyAnimeList accounts — sign-in and two-way library sync',
      description:
        'The headline of this release: you can now connect your AniList and MyAnimeList accounts and sync your library both ways — choosing the direction (import, push, or full sync). These are experimental features, still being tested, so the odd rough edge is expected. Plus your profile shows MyAnimeList stats, and the library is smoother and handles many entries at once.',
      categories: [
        {
          kind: 'feature',
          label: 'Accounts & sync (experimental)',
          entries: [
            'Sign in to AniList and MyAnimeList right inside the app',
            'Two-way library sync — changes flow both ways',
            'Choose the direction: import only, push only, or full sync',
            'MyAnimeList entries are auto-matched to AniList',
          ],
        },
        {
          kind: 'feature',
          label: 'Profile',
          entries: [
            'MyAnimeList stats with rings and a watch-time breakdown',
            'The MyAnimeList tab now matches the AniList dashboard layout',
            'AniList and MyAnimeList profile links open in the built-in browser',
          ],
        },
        {
          kind: 'feature',
          label: 'Library',
          entries: [
            'Multi-select mode and batch actions — status, score and delete in one go',
            'AniList and MyAnimeList reference links open in-app',
            'Smoother scrolling for large libraries (grid and list views)',
          ],
        },
        {
          kind: 'fix',
          label: 'Stability & fixes',
          entries: [
            'Many sign-in and sync robustness fixes — ignoring stale responses and validating account data and tokens',
            'MyAnimeList "time invested" day counts now pluralize correctly',
            'Toolbar icon buttons stay square in tight headers',
          ],
        },
      ],
    },
  },
  {
    version: '0.12.0',
    shortDate: '01.06.2026',
    type: 'minor',
    pl: {
      date: '1 czerwca 2026',
      title: 'Nowości w przeglądarce, odkrywaniu i bibliotece + automatyczne śledzenie postępów',
      description:
        'Duża aktualizacja pełna nowych funkcji. Wbudowana przeglądarka dostała inteligentny pasek adresu, historię i wyszukiwanie na stronie. Odkrywanie pozwala teraz filtrować i sortować tytuły po swojemu, a biblioteka — zaznaczać wiele pozycji naraz i podglądać powiązane anime. Aplikacja potrafi też sama rozpoznać, co oglądasz na większej liczbie stron, i zaktualizować Twój postęp. Do tego sporo dopracowań, czytnik pełnych artykułów i porządne wzmocnienie bezpieczeństwa.',
      categories: [
        {
          kind: 'feature',
          label: 'Przeglądarka',
          entries: [
            'Pasek adresu podpowiada strony podczas pisania (na podstawie historii)',
            'Nowy widok historii przeglądania z możliwością wyczyszczenia',
            'Wyszukiwanie na stronie (Ctrl+F) z podświetleniem trafień',
            'Układ podzielonego okna jest teraz zapamiętywany',
          ],
        },
        {
          kind: 'feature',
          label: 'Odkrywanie',
          entries: [
            'Zaawansowane filtry: gatunki, tagi, ocena, format, rok i więcej',
            'Własne sortowanie wyników we wszystkich zakładkach i w wyszukiwarce',
            'Przełącznik ukrywający tytuły, które już masz w bibliotece',
          ],
        },
        {
          kind: 'feature',
          label: 'Biblioteka',
          entries: [
            'Tryb zaznaczania wielu pozycji i pasek akcji zbiorczych — zmiana statusu, oceny i usuwanie naraz',
            'W szczegółach tytułu widać powiązane anime: sequele, prequele i historie poboczne',
          ],
        },
        {
          kind: 'feature',
          label: 'Automatyczne śledzenie postępów',
          entries: [
            'Aplikacja rozpoznaje, co oglądasz, na większej liczbie stron (Crunchyroll, HiAnime, HiDive, AniList) i aktualizuje postęp w bibliotece',
            'Funkcję można włączyć lub wyłączyć przełącznikiem',
            'Status w Discordzie (Rich Presence) pokazuje, co aktualnie oglądasz',
          ],
        },
        {
          kind: 'feed',
          label: 'Aktualności',
          entries: [
            'Pełne artykuły z kanałów można teraz czytać w całości bezpośrednio w aplikacji',
          ],
        },
        {
          kind: 'polish',
          label: 'Dziennik i dopracowania',
          entries: [
            'Świętowanie kamieni milowych serii wpisów (toast i odznaka)',
            'Ostrzeżenie o limicie znaków w edytorze dziennika',
            'Ponowienie próby, gdy nie uda się wygenerować szczegółów wpisu',
            'Motyw może podążać za jasnym/ciemnym trybem systemu',
            'Czytelniejsze błędy przy imporcie własnego motywu',
            'Nowa sekcja wsparcia aplikacji i opcja GitHub Sponsors',
          ],
        },
        {
          kind: 'app',
          label: 'Pełne czyszczenie danych',
          entries: [
            'Nowa opcja „Usuń wszystkie dane" (reset fabryczny) z potwierdzeniem przez wpisanie tekstu — czyści bazę, sesję przeglądarki i pliki, po czym restartuje aplikację',
          ],
        },
        {
          kind: 'security',
          label: 'Bezpieczeństwo i stabilność',
          entries: [
            'Zamknięto luki w zależnościach aplikacji i dołożono zabezpieczenia przed niebezpiecznymi adresami',
            'Stan przeczytanych aktualności przetrwa teraz ponowną instalację',
            'Aktualizacja silnika interfejsu i duże porządki w kodzie — lepsza stabilność i mniej okazji do błędów',
          ],
        },
      ],
    },
    en: {
      date: 'June 1, 2026',
      title: 'Browser, discovery & library upgrades + automatic progress tracking',
      description:
        "A big feature-packed update. The built-in browser gains a smart address bar, history and find-in-page. Discovery now lets you filter and sort titles your way, and the library lets you select many entries at once and see related anime. The app can also automatically detect what you're watching on more sites and update your progress. Plus plenty of polish, a full-article reader, and a solid security pass.",
      categories: [
        {
          kind: 'feature',
          label: 'Browser',
          entries: [
            'The address bar suggests sites as you type (based on your history)',
            'A new browsing-history view you can clear',
            'Find-in-page (Ctrl+F) with match highlighting',
            'Split-pane layout is now remembered',
          ],
        },
        {
          kind: 'feature',
          label: 'Discovery',
          entries: [
            'Advanced filters: genres, tags, score, format, year and more',
            'Your own sort order across every browse tab and in search',
            'A toggle that hides titles already in your library',
          ],
        },
        {
          kind: 'feature',
          label: 'Library',
          entries: [
            'Multi-select mode and a batch action bar — change status, score and delete in one go',
            'A title’s details now show related anime: sequels, prequels and side stories',
          ],
        },
        {
          kind: 'feature',
          label: 'Automatic progress tracking',
          entries: [
            'The app detects what you’re watching on more sites (Crunchyroll, HiAnime, HiDive, AniList) and updates your library progress',
            'You can turn it on or off with a toggle',
            'Discord Rich Presence shows what you’re currently watching',
          ],
        },
        {
          kind: 'feed',
          label: 'News',
          entries: [
            'Full articles from your feeds can now be read in their entirety right inside the app',
          ],
        },
        {
          kind: 'polish',
          label: 'Diary & polish',
          entries: [
            'Diary streak milestones are celebrated with a toast and a badge',
            'A character-limit warning in the diary editor',
            'A retry option when entry details fail to generate',
            'The theme can follow your system’s light/dark mode',
            'Clearer errors when importing a custom theme',
            'A new app-support section and a GitHub Sponsors option',
          ],
        },
        {
          kind: 'app',
          label: 'Full data wipe',
          entries: [
            'A new “Delete all data” (factory reset) option with type-to-confirm — clears the database, browser session and files, then relaunches the app',
          ],
        },
        {
          kind: 'security',
          label: 'Security & stability',
          entries: [
            'Vulnerabilities in the app’s dependencies were closed and safeguards against unsafe URLs were added',
            'Read-state for news now survives a reinstall',
            'A UI-engine update and a large code cleanup — better stability and fewer chances for bugs',
          ],
        },
      ],
    },
  },
  {
    version: '0.11.0',
    shortDate: '22.05.2026',
    type: 'minor',
    pl: {
      date: '22 maja 2026',
      title: 'Personalizacja nowej karty i własna kolejność widoków',
      description:
        'Strona nowej karty w przeglądarce jest teraz w pełni do dopasowania — w ustawieniach można pokazać lub ukryć poszczególne panele, ustawić ich kolejność i zobaczyć podgląd na żywo. Widoki w docku również można przeciągać i układać po swojemu. Pod maską aplikacja przeszła duże porządki w kodzie, dzięki którym łatwiej będzie o kolejne funkcje.',
      categories: [
        {
          kind: 'feature',
          label: 'Personalizacja nowej karty',
          entries: [
            'Nowa sekcja „Nowa karta" w ustawieniach pozwala dopasować stronę nowej karty we wbudowanej przeglądarce',
            'Można pokazać lub ukryć poszczególne panele: powitanie, „Emitowane dzisiaj", szybki dostęp, ostatnio odwiedzane i „Kontynuuj oglądanie" — oraz znak wodny kanji w tle',
            'Panele można przeciągać i ustawić we własnej kolejności, a jeden przycisk przywraca układ domyślny',
            'Suwak ustawia liczbę kafelków w sekcji „Emitowane dzisiaj" (od 6 do 20)',
            'Przełącznik decyduje, czy w powitaniu pokazywać Twoje imię',
            'Podgląd na żywo od razu pokazuje, jak będzie wyglądać nowa karta',
          ],
        },
        {
          kind: 'feature',
          label: 'Własna kolejność widoków',
          entries: [
            'Widoki w docku można teraz przeciągać i układać w dowolnej kolejności (Ustawienia → Wygląd → Widoki)',
            'Wybrana kolejność obowiązuje wszędzie: w docku, w podglądach w ustawieniach i w onboardingu',
            'Przycisk „Przywróć domyślne" cofa kolejność i widoczność do ustawień startowych',
            'Listę można przestawiać także z klawiatury, nie tylko myszą',
          ],
        },
        {
          kind: 'polish',
          label: 'Drobne dopracowania',
          entries: [
            'Po otwarciu pustej nowej karty kursor od razu ląduje w pasku adresu — można zacząć pisać bez klikania',
          ],
        },
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Na macOS zniknęły ustawienia maskotki, które i tak nic nie robiły (maskotka działa tylko na Windowsie)',
          ],
        },
        {
          kind: 'polish',
          label: 'Stabilność i porządki',
          entries: [
            'Duże porządki w kodzie aplikacji i strony: rozbite zbyt duże pliki, usunięty nieużywany kod, ujednolicone wzorce i dołożone testy — bez zmian w działaniu, ale z mniejszą liczbą okazji do błędów',
          ],
        },
      ],
    },
    en: {
      date: 'May 22, 2026',
      title: 'New Tab customization and your own view order',
      description:
        "The browser's New Tab page is now fully yours to shape — show or hide individual panels in settings, set their order, and watch a live preview. Views in the dock can be dragged into your own order too. Under the hood the app went through a big code cleanup that makes future features easier.",
      categories: [
        {
          kind: 'feature',
          label: 'New Tab customization',
          entries: [
            'A new “New Tab” settings section lets you customize the in-app browser’s New Tab page',
            'Show or hide individual panels: greeting, “Airing today”, quick access, recent visits and “Resume watching” — plus the kanji watermark in the background',
            'Drag the panels into any order you like, and one button restores the default layout',
            'A slider sets how many cards appear in “Airing today” (6 to 20)',
            'A toggle decides whether your name shows in the greeting',
            'A live preview shows exactly how the New Tab page will look',
          ],
        },
        {
          kind: 'feature',
          label: 'Your own view order',
          entries: [
            'Views in the dock can now be dragged into any order you like (Settings → Appearance → Views)',
            'The order you choose applies everywhere: the dock, the settings previews and onboarding',
            'A “Reset to defaults” button returns the order and visibility to their starting state',
            'You can reorder the list with the keyboard too, not just the mouse',
          ],
        },
        {
          kind: 'polish',
          label: 'Small refinements',
          entries: [
            'Opening a blank new tab puts the cursor straight in the address bar — start typing without clicking first',
          ],
        },
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'On macOS the mascot settings that did nothing anyway are gone (the mascot is Windows-only)',
          ],
        },
        {
          kind: 'polish',
          label: 'Stability & cleanup',
          entries: [
            'A big code cleanup across the app and website: oversized files split up, unused code removed, patterns unified and tests added — no change in behavior, just fewer chances for bugs',
          ],
        },
      ],
    },
  },
  {
    version: '0.10.1',
    shortDate: '17.05.2026',
    type: 'minor',
    pl: {
      date: '17 maja 2026',
      title: 'Pełna kontrola nad własnym tłem',
      description:
        'Tła własne miały dotąd niewidoczną warstwę przyciemniającą, przez którą obraz wyglądał trochę ciemniej nawet przy 100% widoczności. Teraz to przyciemnienie można dopasować suwakiem obok przezroczystości i rozmycia — a istniejące tła wyglądają dokładnie tak samo jak wcześniej, dopóki nic nie ruszysz. Do tego flaga przy opcji „English" w pierwszym uruchomieniu pokazuje teraz prawdziwą flagę Wielkiej Brytanii.',
      categories: [
        {
          kind: 'feature',
          label: 'Pełna kontrola nad tłem',
          entries: [
            'Nowy suwak „Przyciemnienie" w ustawieniach tła — obok przezroczystości i rozmycia',
            'Można teraz całkowicie wyłączyć przyciemnienie i zobaczyć obraz dokładnie taki, jaki jest',
            'Domyślna wartość zachowuje dotychczasowy wygląd, więc istniejące tła nie zmieniają się same z siebie',
          ],
        },
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Flaga przy opcji „English" w pierwszym uruchomieniu pokazuje teraz prawdziwą flagę Wielkiej Brytanii zamiast pasków w niewłaściwych kolorach',
          ],
        },
      ],
    },
    en: {
      date: 'May 17, 2026',
      title: 'Full control over your custom background',
      description:
        'Custom backgrounds had a hidden dimming layer that kept the image looking a bit darker even at full opacity. You can now adjust that dimming with a slider sitting next to opacity and blur — and existing backgrounds keep their current look until you decide to touch them. Plus the flag next to the “English” option on first launch now shows the real Union Jack.',
      categories: [
        {
          kind: 'feature',
          label: 'Full background control',
          entries: [
            'New “Dim” slider in background settings — sits next to opacity and blur',
            'You can now turn the dimming off completely and see the image exactly as it is',
            'The default matches the previous look so existing backgrounds don’t change on their own',
          ],
        },
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'The flag next to the “English” option on first launch now shows the real Union Jack instead of stripes in the wrong colours',
          ],
        },
      ],
    },
  },
  {
    version: '0.10.0',
    shortDate: '15.05.2026',
    type: 'major',
    pl: {
      date: '15 maja 2026',
      title: 'Aplikacja po angielsku i polsku',
      description:
        'Cała aplikacja oraz strona startowa są teraz dostępne po angielsku i po polsku — można przełączyć w ustawieniach lub w stopce strony, a przy pierwszym uruchomieniu język dobiera się sam pod ustawienia systemu. Daty, godziny, „X minut temu", rozmiary plików i dni tygodnia szanują wybrany język. Do tego mniej zużycia RAM-u przy długich sesjach i drobne poprawki.',
      categories: [
        {
          kind: 'feature',
          label: 'Pełna obsługa angielskiego',
          entries: [
            'Cała aplikacja przetłumaczona na angielski — widoki, ustawienia, powiadomienia systemowe, ikona w zasobniku, okna dialogowe i Discord Rich Presence',
            'Przełącznik języka w Ustawieniach → Wygląd oraz w stopce strony startowej',
            'Przy pierwszym uruchomieniu aplikacja sama wybiera polski lub angielski na podstawie języka systemu',
            'Strona startowa wczytuje się od razu w odpowiednim języku, bez krótkiego mignięcia po polsku',
            'Daty, „X minut temu", rozmiary plików, godziny w harmonogramie i dni tygodnia są zawsze zgodne z wybranym językiem',
            'Historia zmian w aplikacji renderuje się w aktywnym języku',
          ],
        },
        {
          kind: 'polish',
          label: 'Mniej zużycia RAM-u',
          entries: [
            'Wewnętrzne bufory mają teraz limit i samoczynnie czyszczą stare wpisy zamiast rosnąć w nieskończoność',
            'Posprzątane „wycieki" nasłuchów, timerów i obserwerów, które utrzymywały się po zamknięciu okien',
            'Buforowane formatery dat i liczb — mniej pracy przy każdym renderowaniu list',
          ],
        },
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Aktualizator nie myli się już, gdy plik instalatora jest jeszcze publikowany tuż po wydaniu — czeka i pobiera, zamiast pokazywać błąd',
            'Cały obszar krzyżyka w kafelkach skrótów nowej karty jest klikalny, nie tylko sama ikona',
            'Onboarding pokazuje rzeczywisty stan języka i Discorda w ekranie podsumowania',
          ],
        },
        {
          kind: 'security',
          label: 'Bezpieczeństwo',
          entries: [
            'Załatane luki w bibliotekach pomocniczych (hono, fast-uri, devalue, yaml)',
            'Aktualizacja silnika Electron i kilku narzędzi deweloperskich',
          ],
        },
      ],
    },
    en: {
      date: 'May 15, 2026',
      title: 'The app in English and Polish',
      description:
        'The whole app and the website are now available in English and Polish — switch in Settings or the website footer, and on the first launch the language is picked from your system settings. Dates, times, “X minutes ago”, file sizes and weekday names all respect the chosen language. Plus less RAM use during long sessions and a few smaller fixes.',
      categories: [
        {
          kind: 'feature',
          label: 'Full English support',
          entries: [
            'The whole app is now translated to English — views, settings, system notifications, the tray icon, dialogs and Discord Rich Presence',
            'A language switch in Settings → Appearance and in the website footer',
            'On first launch the app picks Polish or English based on your system language',
            'The website loads in the right language right away, without a brief flash of the wrong one',
            'Dates, “X minutes ago”, file sizes, schedule times and weekday names always match the chosen language',
            'The in-app changelog renders in the active language',
          ],
        },
        {
          kind: 'polish',
          label: 'Less RAM use',
          entries: [
            'Internal caches now have a size cap and clean themselves up instead of growing forever',
            'Cleaned-up “leaks” from listeners, timers and observers that lingered after windows closed',
            'Date and number formatters are cached — less work on every list render',
          ],
        },
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'The updater no longer trips up when the installer file is still being published right after a release — it waits and downloads instead of showing an error',
            'The whole X area on new-tab quick-access tiles is clickable, not just the icon itself',
            'Onboarding now shows the real language and Discord state on the summary screen',
          ],
        },
        {
          kind: 'security',
          label: 'Security',
          entries: [
            'Patched vulnerabilities in helper libraries (hono, fast-uri, devalue, yaml)',
            'Engine bump for Electron and a few development tools',
          ],
        },
      ],
    },
  },
  {
    version: '0.9.0',
    shortDate: '02.05.2026',
    type: 'minor',
    pl: {
      date: '2 maja 2026',
      title: 'Własna maskotka i przełącznik animacji bujania',
      description:
        'Maskotka na pulpicie może teraz nosić własny obrazek — wystarczy wskazać PNG, JPG, GIF albo WEBP w Ustawieniach → Maskotka i Shiro-chan zamieni się w cokolwiek innego. Do tego nowy przełącznik wyłącza delikatne bujanie maskotki, gdy przeszkadza, a podgląd pozycji docka w ustawieniach pokazuje teraz prawdziwe ikony i maskotkę zamiast samych kropek.',
      categories: [
        {
          kind: 'feature',
          label: 'Własna maskotka',
          entries: [
            'Nowa opcja w Ustawieniach → Maskotka pozwala wybrać własny obrazek — obsługiwane formaty PNG, JPG, GIF i WEBP, do 10 MB i 2048×2048 px',
            'Trzy tryby skalowania (zmieść, wypełnij, rozciągnij), dzięki którym niekwadratowe obrazki nie są rozciągane na siłę',
            'Animowane GIFy pokazują pierwszą klatkę — sama animacja ramki nie jest odtwarzana',
            'Plik zapisuje się lokalnie i wraca po restarcie aplikacji, a przycisk „Przywróć domyślną" cofa do Shiro-chan',
          ],
        },
        {
          kind: 'feature',
          label: 'Przełącznik animacji bujania',
          entries: [
            'Nowy przełącznik w Ustawieniach → Maskotka wyłącza delikatne bujanie maskotki',
            'Po wyłączeniu maskotka renderuje jedną statyczną klatkę i zwalnia odświeżanie 60 razy na sekundę — zero zużycia procesora w spoczynku',
            'Po ponownym włączeniu animacja startuje płynnie od początku, zamiast skakać w środku cyklu',
          ],
        },
        {
          kind: 'polish',
          label: 'Drobne dopracowania',
          entries: [
            'Podgląd pozycji docka w Ustawieniach pokazuje teraz prawdziwe ikony widoków i maskotkę zamiast szarych kropek',
            'Większy odstęp pod kartą profilu, żeby treść poniżej nie sklejała się z nagłówkiem',
            'Zaostrzona walidacja krawędzi natywnego skalera maskotki — drobne, ale eliminuje nietypowe artefakty graficzne',
          ],
        },
        {
          kind: 'polish',
          label: 'Stabilność i porządki',
          entries: [
            'Wewnętrzne porządki w module nakładki maskotki — usunięty nieużywany kod backendu macOS (sama maskotka na macOS była wyłączona już wcześniej; aplikacja na macOS dalej jest dostępna)',
            'Aktualizacje zależności w grupach produkcyjnej i deweloperskiej',
          ],
        },
      ],
    },
    en: {
      date: 'May 2, 2026',
      title: 'Custom mascot image and a bob-animation toggle',
      description:
        'Your desktop mascot can now wear a picture of your choosing — point Settings → Mascot at a PNG, JPG, GIF or WEBP and Shiro-chan turns into whatever you like. There is also a new switch that turns off the mascot’s gentle bobbing when it gets distracting, and the dock-position preview in settings now shows real view icons and the mascot instead of plain dots.',
      categories: [
        {
          kind: 'feature',
          label: 'Custom mascot image',
          entries: [
            'A new option in Settings → Mascot lets you pick your own image — PNG, JPG, GIF and WEBP are supported, up to 10 MB and 2048×2048 px',
            'Three scale modes (contain, cover, stretch) so non-square images aren’t forcibly distorted',
            'Animated GIFs show their first frame only — the frame animation itself isn’t played',
            'The file is stored locally and comes back after a restart, and a “Restore default” button reverts to Shiro-chan',
          ],
        },
        {
          kind: 'feature',
          label: 'Bob-animation toggle',
          entries: [
            'A new switch in Settings → Mascot turns off the mascot’s gentle bobbing',
            'When off, the mascot renders a single static frame and stops refreshing 60 times a second — zero CPU use while idle',
            'Turning it back on restarts the animation smoothly from the beginning instead of jumping mid-cycle',
          ],
        },
        {
          kind: 'polish',
          label: 'Small refinements',
          entries: [
            'The dock-position preview in Settings now shows real view icons and the mascot instead of grey dots',
            'More breathing room below the profile card so the content underneath doesn’t crowd the header',
            'Tighter edge validation in the native mascot scaler — minor, but it eliminates the odd graphical artifact',
          ],
        },
        {
          kind: 'polish',
          label: 'Stability & cleanup',
          entries: [
            'Internal tidy-up of the mascot overlay module — removed unused macOS backend code (the macOS mascot itself was already disabled; the macOS app is still available)',
            'Dependency updates in the production and development groups',
          ],
        },
      ],
    },
  },
  {
    version: '0.8.0',
    shortDate: '28.04.2026',
    type: 'minor',
    pl: {
      date: '28 kwietnia 2026',
      title: 'Podzielone karty w przeglądarce i czytelniejsze błędy AniList',
      description:
        'Wbudowana przeglądarka uczy się nowej sztuczki: można teraz otworzyć dwie strony obok siebie w jednej karcie — wystarczy przeciągnąć kartę na bok, żeby utworzyć drugi panel. Idealne do oglądania odcinka i jednoczesnego sprawdzania AniList. Do tego ekrany Profilu, Harmonogramu i Odkrywaj nie pokazują już pustej strony, gdy AniList ma awarię — zamiast tego widać czytelny komunikat z powodem problemu.',
      categories: [
        {
          kind: 'feature',
          label: 'Podzielone karty w przeglądarce',
          entries: [
            'Karty w przeglądarce można teraz dzielić na dwa panele obok siebie — przeciągnij kartę na lewą lub prawą krawędź drugiej karty, a powstanie podział z dwoma niezależnymi widokami',
            'Każdy panel ma własny pasek nawigacji (cofnij, odśwież, adres) i działa jak osobna karta — można oglądać odcinek po jednej stronie i przeglądać AniList po drugiej',
            'Szerokość paneli regulowana suwakiem między nimi, a układ przetrwa restart aplikacji',
            'Skrót Ctrl+W zamyka aktywny panel zamiast całej karty, a w menu pojawia się opcja „Połącz z powrotem", aby wrócić do pojedynczego widoku',
            'Funkcja jest opcjonalna — można ją włączyć w Ustawieniach → Przeglądarka',
          ],
        },
        {
          kind: 'feature',
          label: 'Czytelniejsze błędy AniList',
          entries: [
            'Profil, Harmonogram, Odkrywaj i panel losowych propozycji pokazują teraz wyraźny komunikat, gdy AniList jest niedostępny, zamiast pustej strony lub cichego błędu',
            'Aplikacja rozpoznaje trzy najczęstsze przypadki: AniList wyłączył tymczasowo swoje API, przekroczono limit zapytań oraz brak połączenia z internetem',
            'Każdy komunikat ma przycisk „Spróbuj ponownie", więc nie trzeba ręcznie odświeżać widoku',
          ],
        },
        {
          kind: 'polish',
          label: 'Stabilność i wydajność',
          entries: [
            'Otwarte strony w przeglądarce zachowują swój stan podczas dzielenia, łączenia i zamykania paneli — żaden odtwarzacz nie startuje od nowa',
            'Discord Rich Presence aktualizuje się płynniej przy przełączaniu paneli, bez zbędnych odświeżeń',
            'Drobne optymalizacje przeciągania kart i suwaka między panelami, dzięki którym animacje pozostają płynne nawet przy wielu otwartych kartach',
            'Aktualizacje zależności w grupie produkcyjnej i deweloperskiej',
          ],
        },
      ],
    },
    en: {
      date: 'April 28, 2026',
      title: 'Split-view browser tabs and clearer AniList errors',
      description:
        'The in-app browser learns a new trick: you can now open two pages side by side in one tab — just drag a tab to the edge to create a second pane. Perfect for watching an episode while checking AniList. On top of that, the Profile, Schedule and Discover screens no longer show a blank page when AniList is down — you get a clear message explaining what went wrong instead.',
      categories: [
        {
          kind: 'feature',
          label: 'Split-view browser tabs',
          entries: [
            'Browser tabs can now be split into two side-by-side panes — drag a tab onto the left or right edge of another tab to create a split with two independent views',
            'Each pane has its own navigation bar (back, refresh, address) and behaves like a separate tab — watch an episode on one side and browse AniList on the other',
            'Pane width is adjustable with the divider between them, and the layout survives an app restart',
            'Ctrl+W closes the active pane instead of the whole tab, and a “Merge back” option in the menu returns you to a single view',
            'The feature is optional — turn it on in Settings → Browser',
          ],
        },
        {
          kind: 'feature',
          label: 'Clearer AniList errors',
          entries: [
            'Profile, Schedule, Discover and the random-suggestion panel now show a clear message when AniList is unavailable, instead of a blank page or a silent error',
            'The app recognises the three most common cases: AniList has temporarily disabled its API, the request limit has been exceeded, and there’s no internet connection',
            'Every message has a “Try again” button, so you don’t have to refresh the view by hand',
          ],
        },
        {
          kind: 'polish',
          label: 'Stability & performance',
          entries: [
            'Open pages in the browser keep their state while you split, merge and close panes — no player starts over',
            'Discord Rich Presence updates more smoothly when switching panes, without needless refreshes',
            'Minor optimisations for tab dragging and the divider between panes, keeping animations smooth even with many tabs open',
            'Dependency updates in the production and development groups',
          ],
        },
      ],
    },
  },
  {
    version: '0.7.0',
    shortDate: '27.04.2026',
    type: 'major',
    pl: {
      date: '27 kwietnia 2026',
      title: 'Statystyki w aplikacji, blokowanie reklam na żywo i odświeżony system aktualizacji',
      description:
        'Sporo nowości: profil dostał zakładkę „W aplikacji" z licznikami czasu i 12-tygodniową siatką aktywności, blokada reklam pobiera teraz listy filtrów uBlock Origin na żywo (mocno pomaga na YouTubie), a sekcje aktualizacji i błędów dostały nowy wygląd. Do tego solidne hartowanie bezpieczeństwa, aktualizacja silnika do Electron 41.3.0 i wiele bumpów zależności.',
      categories: [
        {
          kind: 'feature',
          label: 'Statystyki użycia',
          entries: [
            'Nowa zakładka „W aplikacji" w profilu z trzema licznikami: ile czasu masz aplikację otwartą, ile aktywnie z niej korzystasz i ile spędziłeś na oglądaniu anime',
            '12-tygodniowa siatka aktywności w stylu GitHuba — od razu widać kiedy korzystasz z aplikacji najczęściej',
            'Aktualna i najdłuższa seria dni z aktywnością obok siatki, plus odznaka „Aktywny od X dni" w pasku bocznym profilu',
            'Liczniki zatrzymują się gdy komputer śpi, jest zablokowany ekran lub aplikacja jest schowana — nie liczą czasu który nie należy do Ciebie',
            'Wszystko jest lokalne, nic nie wychodzi poza Twoje urządzenie. W razie potrzeby przycisk „Wyczyść statystyki" wymaże dane',
          ],
        },
        {
          kind: 'feature',
          label: 'Nowy wygląd aktualizacji i błędów',
          entries: [
            'Ekran startowy ma teraz osobny wariant przy instalacji aktualizacji (znak 新, niebieski pierścień, śpiąca maskotka) oraz przy błędzie (znak 失)',
            'Sekcja Aktualizacje pokazuje kiedy ostatnio sprawdzaliśmy oraz dokładny postęp pobierania w megabajtach',
            'Ekran błędu został kompletnie przeprojektowany w spójnym stylu z resztą aplikacji',
          ],
        },
        {
          kind: 'feature',
          label: 'Wbudowana przeglądarka',
          entries: [
            'Blokada reklam pobiera teraz listy filtrów uBlock Origin na żywo i odświeża je co 2 godziny — zauważalna poprawa na YouTubie, gdzie reklamy przebijają się rzadziej',
            'Silnik adblocka został dostrojony pod nowsze typy żądań YouTube oraz zaawansowane reguły kosmetyczne',
            'Discord Rich Presence zawsze pokazuje przycisk z linkiem do strony ShiroAni',
          ],
        },
        {
          kind: 'feature',
          label: 'Dopracowania interfejsu',
          entries: [
            'Dock nawigacyjny ma teraz osobny uchwyt do przeciągania na końcu paska — koniec z przypadkowym chwytaniem ikon przy klikaniu. Uchwyt znika gdy przeciąganie jest wyłączone w Ustawieniach → Dock',
            'Dock zwinięty do logo można rozwinąć dotykiem lub klawiaturą — wcześniej działało tylko myszą',
            'Usuwanie własnego motywu pyta teraz o potwierdzenie w eleganckim oknie z nazwą motywu, zamiast w surowym alercie systemowym',
          ],
        },
        {
          kind: 'security',
          label: 'Bezpieczeństwo',
          entries: [
            'Hartowanie warstwy IPC: pobieranie obrazków sprawdza listę dozwolonych domen i blokuje sieci wewnętrzne (zabezpieczenie przed SSRF), zapis do magazynu wymaga dokładnego dopasowania klucza, dziennik logów ma limit szybkości',
            'Wbudowana przeglądarka straciła uprawnienie do schowka, weryfikacja przekierowań działa poprawniej, a polityki uprawnień zostały zaostrzone',
            'Nawigacja głównego okna oraz wewnętrzny schemat shiroani-bg:// sprawdzają adresy bardziej rygorystycznie',
            'Aktualizacja silnika Electron 40 → 41.3.0 oraz pakietów z zaadresowanymi lukami zabezpieczeń (axios, undici, h3, picomatch i inne)',
          ],
        },
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Edytor motywów: bazowy preset można znów wybrać po otwarciu „Nowy motyw" gdy aktywny jest własny motyw',
            'Aktywna ikona w docku trzyma się środka także po zmianie skali czcionek',
            'Drugie uruchomienie aplikacji od razu kończy się i przywraca pierwsze okno, zamiast najpierw wczytywać moduły',
            'Drobne poprawki wizualne w sekcji aktualizacji (wyśrodkowanie odznaki statusu)',
          ],
        },
        {
          kind: 'polish',
          label: 'Stabilność i porządki',
          entries: [
            'Zaktualizowane silniki i zależności: Electron 41.3.0, Vite 8, zod 4, lucide-react 1 (mniejszy pakiet ikon o ~32%), tailwindcss 4.2.4 i wiele innych',
            'Porządki w architekturze procesu głównego: powiadomienia i warstwa preload zostały podzielone na mniejsze, dobrze odseparowane moduły, co ułatwi kolejne funkcje',
            'Dependabot pilnuje codziennie aktualizacji bezpieczeństwa, a CI sprawdza również stronę i bota przy każdym pull requeście',
          ],
        },
      ],
    },
    en: {
      date: 'April 27, 2026',
      title: 'In-app statistics, live ad blocking and a refreshed update system',
      description:
        'Plenty of new things: the profile gained an “In the app” tab with time counters and a 12-week activity grid, the ad blocker now pulls uBlock Origin’s filter lists live (a big help on YouTube), and the update and error screens got a new look. On top of that, a solid security hardening pass, an engine bump to Electron 41.3.0, and a wave of dependency updates.',
      categories: [
        {
          kind: 'feature',
          label: 'Usage statistics',
          entries: [
            'A new “In the app” tab in the profile with three counters: how long the app has been open, how long you actively use it, and how much time you’ve spent watching anime',
            'A 12-week GitHub-style activity grid — see at a glance when you use the app most',
            'Current and longest activity streaks next to the grid, plus an “Active for X days” badge in the profile sidebar',
            'Counters pause when the computer sleeps, the screen is locked or the app is hidden — they don’t count time that isn’t yours',
            'Everything is local; nothing leaves your device. If you ever need to, a “Clear statistics” button wipes the data',
          ],
        },
        {
          kind: 'feature',
          label: 'New update and error screens',
          entries: [
            'The splash screen now has a separate variant while installing an update (the 新 symbol, a blue ring, a sleeping mascot) and on errors (the 失 symbol)',
            'The Updates section shows when we last checked and the exact download progress in megabytes',
            'The error screen has been completely redesigned to match the rest of the app',
          ],
        },
        {
          kind: 'feature',
          label: 'Built-in browser',
          entries: [
            'The ad blocker now pulls uBlock Origin’s filter lists live and refreshes them every 2 hours — a noticeable improvement on YouTube, where ads slip through less often',
            'The adblock engine has been tuned for newer YouTube request types and advanced cosmetic rules',
            'Discord Rich Presence always shows a button linking to the ShiroAni website',
          ],
        },
        {
          kind: 'feature',
          label: 'Interface refinements',
          entries: [
            'The navigation dock now has a dedicated drag handle at the end of the bar — no more grabbing icons by accident when clicking. The handle disappears when dragging is turned off in Settings → Dock',
            'A dock collapsed down to the logo can be expanded by touch or keyboard — previously this only worked with the mouse',
            'Deleting a custom theme now asks for confirmation in a tidy dialog showing the theme name, instead of a bare system alert',
          ],
        },
        {
          kind: 'security',
          label: 'Security',
          entries: [
            'IPC layer hardening: image fetching checks an allowed-domain list and blocks internal networks (SSRF protection), writing to storage requires an exact key match, and the log writer is rate-limited',
            'The in-app browser lost its clipboard permission, redirect verification is more correct, and permission policies have been tightened',
            'Main-window navigation and the internal shiroani-bg:// scheme validate addresses more strictly',
            'Engine bump from Electron 40 → 41.3.0 plus packages with addressed security advisories (axios, undici, h3, picomatch and others)',
          ],
        },
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'Theme editor: the base preset can be picked again after opening “New theme” while a custom theme is active',
            'The active dock icon stays centered after a font-scale change',
            'A second app launch now exits and restores the first window right away, instead of loading modules first',
            'Minor visual fixes in the Updates section (centered status badge)',
          ],
        },
        {
          kind: 'polish',
          label: 'Stability & cleanup',
          entries: [
            'Updated engines and dependencies: Electron 41.3.0, Vite 8, zod 4, lucide-react 1 (icon bundle smaller by ~32%), tailwindcss 4.2.4 and many more',
            'Main-process architecture cleanup: notifications and the preload layer were split into smaller, well-isolated modules, making future features easier',
            'Dependabot watches for security updates daily, and CI now also checks the website and the bot on every pull request',
          ],
        },
      ],
    },
  },
  {
    version: '0.6.2',
    shortDate: '22.04.2026',
    type: 'minor',
    pl: {
      date: '22 kwietnia 2026',
      title: 'Naprawa logowania do AniList i nowa sekcja Rodzina',
      description:
        'Szybka poprawka przywracająca logowanie do AniList we wbudowanej przeglądarce. Przy okazji w ustawieniach pojawiła się nowa sekcja Rodzina, w której można poznać siostrzane aplikacje — Shiranami i KireiManga.',
      categories: [
        {
          kind: 'feature',
          label: 'Nowości',
          entries: [
            'Nowa sekcja Rodzina w Ustawieniach — prezentacja siostrzanych aplikacji Shiranami i KireiManga',
          ],
        },
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Logowanie do AniList we wbudowanej przeglądarce znów przechodzi weryfikację antybotową',
          ],
        },
        {
          kind: 'polish',
          label: 'Dopracowania',
          entries: [
            'Historia zmian domyślnie ukryta w docku; jej ikona nadal widoczna w podglądzie Widoków w ustawieniach',
          ],
        },
      ],
    },
    en: {
      date: 'April 22, 2026',
      title: 'AniList login fix and a new Family section',
      description:
        'A quick fix restoring AniList login in the in-app browser. While we were at it, a new Family section appeared in settings where you can meet the sibling apps — Shiranami and KireiManga.',
      categories: [
        {
          kind: 'feature',
          label: 'New',
          entries: [
            'A new Family section in Settings — a showcase of the sibling apps Shiranami and KireiManga',
          ],
        },
        {
          kind: 'fix',
          label: 'Fixes',
          entries: ['Logging into AniList in the in-app browser passes the anti-bot check again'],
        },
        {
          kind: 'polish',
          label: 'Refinements',
          entries: [
            'The changelog is hidden in the dock by default; its icon still shows in the Views preview in settings',
          ],
        },
      ],
    },
  },
  {
    version: '0.6.1',
    shortDate: '21.04.2026',
    type: 'minor',
    pl: {
      date: '21 kwietnia 2026',
      title: 'Szybka poprawka zakładek i przeczytanych wiadomości',
      description:
        'Drobna aktualizacja naprawiająca zapisywanie zakładek i stanu przeczytania w widoku Aktualności. Po redesignie dwa nowe klucze zapisu nie zostały dodane do listy dozwolonej, przez co zakładki i oznaczenia przeczytanych artykułów nie przetrwały restartu aplikacji.',
      categories: [
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Zakładki w Aktualnościach zapisują się i przeżywają restart aplikacji',
            'Oznaczenia przeczytanych artykułów w Aktualnościach również zapisują się poprawnie',
          ],
        },
      ],
    },
    en: {
      date: 'April 21, 2026',
      title: 'Quick fix for bookmarks and read articles',
      description:
        'A small update fixing how bookmarks and read state are saved in the News view. After the redesign, two new storage keys weren’t added to the allowed list, so bookmarks and read-article marks didn’t survive an app restart.',
      categories: [
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'Bookmarks in News are saved and survive an app restart',
            'Read-article marks in News are now saved correctly as well',
          ],
        },
      ],
    },
  },
  {
    version: '0.6.0',
    shortDate: '21.04.2026',
    type: 'major',
    pl: {
      date: '21 kwietnia 2026',
      title: 'Wielki redesign, nowy wygląd aplikacji i nowa strona',
      description:
        'Największa aktualizacja wizualna od premiery. ShiroAni dostała kompletnie przeprojektowany interfejs z nowymi motywami, odświeżonymi widokami i rozbudowanymi ustawieniami. Strona internetowa również została zbudowana od zera. Jeśli coś wygląda znajomo, ale inaczej, tak, to właśnie to.',
      categories: [
        {
          kind: 'feature',
          label: 'Nowy wygląd aplikacji',
          entries: [
            'Przeprojektowany pasek tytułu, dock nawigacyjny, nagłówki widoków i tła z subtelnym watermarkiem kanji',
            '17 gotowych motywów w nowym systemie kolorów OKLCH z obsługą jasnych i ciemnych wariantów',
            'Edytor własnego motywu z podglądem na żywo, dostępny w Ustawieniach → Motywy',
            'Czcionki Shippori Mincho, DM Sans i JetBrains Mono dołączone do aplikacji, bez pobierania z sieci',
            'Nowy ekran startowy z podwójnymi pierścieniami, pulsującą maskotką i płynnym paskiem postępu',
          ],
        },
        {
          kind: 'feature',
          label: 'Odświeżone widoki',
          entries: [
            'Onboarding: siedmiostopniowy kreator z wyborem pozycji docka, blokowania reklam i podsumowaniem',
            'Biblioteka i profil: nowe karty, modal szczegółów i wykresy kołowe z podziałem na gatunki i studia',
            'Harmonogram: widoki dzień, tydzień i plakat, wskaźnik emisji na żywo oraz podświetlenie serii z biblioteki i subskrypcji',
            'Aktualności: nagłówek z wyróżnioną wiadomością, czytnik w modalu, zapamiętywanie przeczytanych i nowa zakładka Zakładki',
            'Odkrywaj: cztery zakładki i losowy nagłówek z propozycją',
            'Dziennik: edytor w miejscu, oś czasu wpisów i pasek boczny z rozkładem gatunków i studiów',
            'Historia zmian dostępna z Ustawienia → O aplikacji, zawsze z aktualną listą wydań',
          ],
        },
        {
          kind: 'feature',
          label: 'Ustawienia i nowe opcje',
          entries: [
            'Sekcja Wygląd podzielona na cztery grupy: Motywy, Tło, Dock i Widoki, każda z podglądem',
            'Pozycja docka przy dowolnej krawędzi ekranu, łącznie z nową krawędzią górną',
            'Ukrywanie nieużywanych widoków w docku z podglądem zmian na żywo',
            'Biała lista adblocka dla wybranych domen, przeniesiona z paska przeglądarki do Ustawień',
            'Zachowanie kart: przywracanie sesji i zapisywanie historii jako osobne przełączniki',
            'Imię użytkownika wyświetlane w powitaniu na nowej karcie przeglądarki',
            'Eksport danych: kafelki z zakresem i liczbą elementów do wyboru',
            'Edytor szablonów Discord Rich Presence w układzie dwukolumnowym z podglądem rozmiaru maskotki',
          ],
        },
        {
          kind: 'feature',
          label: 'Tryb deweloperski',
          entries: [
            'Nowa sekcja Zaawansowane → Deweloper w Ustawieniach, włączana jednym przełącznikiem',
            'Otwieranie narzędzi deweloperskich okna głównego',
            'Kopiowanie diagnostyki do schowka: wersja, system, ostatnie wpisy z dziennika zdarzeń',
            'Podgląd logów aplikacji w czasie rzeczywistym w osobnym oknie',
          ],
        },
        {
          kind: 'polish',
          label: 'Stabilność i dopracowania',
          entries: [
            'Przepisany system logowania z bezpiecznym redagowaniem wrażliwych pól i rotacją plików',
            'Naturalniej brzmiące polskie teksty w całej aplikacji: biblioteka, odkrywaj, aktualności, ustawienia i onboarding',
            'Stabilniejsza obsługa błędów i nieoczekiwanych wyjątków w oknie głównym',
          ],
        },
        {
          kind: 'feature',
          label: 'Nowa strona internetowa',
          entries: [
            'Strona shiroani zbudowana od zera z nowym układem, animacjami i stylem zgodnym z aplikacją',
            'Strona Pobierz pobiera listę wersji z GitHuba i pokazuje właściwy plik dla Twojego systemu',
            'Strona Historia zmian z tymi samymi notkami co w aplikacji, jedno źródło dla obu miejsc',
            'Menu mobilne z wysuwanym panelem na mniejszych ekranach',
          ],
        },
      ],
    },
    en: {
      date: 'April 21, 2026',
      title: 'The big redesign — a new look for the app and a new website',
      description:
        'The biggest visual update since launch. ShiroAni gained a completely redesigned interface with new themes, refreshed views and an expanded settings surface. The website was also rebuilt from scratch. If something looks familiar but different — yes, that’s it.',
      categories: [
        {
          kind: 'feature',
          label: 'A new look for the app',
          entries: [
            'Redesigned titlebar, navigation dock, view headers and backdrops with a subtle kanji watermark',
            '17 built-in themes on a new OKLCH color system with light and dark variants',
            'A custom-theme editor with live preview, available in Settings → Themes',
            'Shippori Mincho, DM Sans and JetBrains Mono fonts bundled with the app, no web download',
            'A new splash screen with double rings, a pulsing mascot and a smooth progress bar',
          ],
        },
        {
          kind: 'feature',
          label: 'Refreshed views',
          entries: [
            'Onboarding: a seven-step wizard with dock position, ad blocking and a summary',
            'Library and profile: new cards, a detail modal and pie charts breaking down genres and studios',
            'Schedule: day, week and poster layouts, a live-airing indicator and tinting for library and subscribed series',
            'News: a header with a highlighted story, an in-modal reader, remembered read state and a new Bookmarks tab',
            'Discover: four tabs and a random suggestion header',
            'Diary: an inline editor, a timeline of entries and a sidebar with genre and studio breakdowns',
            'The changelog, available from Settings → About, always with the current list of releases',
          ],
        },
        {
          kind: 'feature',
          label: 'Settings and new options',
          entries: [
            'The Appearance section split into four groups: Themes, Background, Dock and Views, each with a preview',
            'Dock position on any screen edge, including a new top edge',
            'Hiding unused views in the dock with a live preview of the changes',
            'An adblock whitelist for selected domains, moved from the browser bar into Settings',
            'Tab behavior: restoring the session and saving history as separate toggles',
            'Your name shown in the greeting on the browser’s new-tab page',
            'Data export: tiles with a selectable scope and item count',
            'A Discord Rich Presence template editor in a two-column layout with a mascot-size preview',
          ],
        },
        {
          kind: 'feature',
          label: 'Developer mode',
          entries: [
            'A new Advanced → Developer section in Settings, enabled with a single toggle',
            'Opening the main window’s developer tools',
            'Copying diagnostics to the clipboard: version, system, recent event-log entries',
            'A real-time view of the app logs in a separate window',
          ],
        },
        {
          kind: 'polish',
          label: 'Stability & refinements',
          entries: [
            'A rewritten logging system with safe redaction of sensitive fields and file rotation',
            'More natural-sounding Polish copy across the app: library, discover, news, settings and onboarding',
            'More stable handling of errors and unexpected exceptions in the main window',
          ],
        },
        {
          kind: 'feature',
          label: 'A new website',
          entries: [
            'The shiroani site rebuilt from scratch with a new layout, animations and a style matching the app',
            'A Download page that pulls the version list from GitHub and shows the right file for your system',
            'A Changelog page with the same notes as in the app — one source for both places',
            'A mobile menu with a slide-down panel on smaller screens',
          ],
        },
      ],
    },
  },
  {
    version: '0.5.0',
    shortDate: '13.04.2026',
    type: 'major',
    pl: {
      date: '13 kwietnia 2026',
      title: 'Odkrywaj anime, pokaż swój profil i wracaj szybciej do oglądania',
      description:
        'Ta aktualizacja skupia się głównie na wygodzie. Pojawił się nowy widok Odkrywaj, profil AniList z kartą do udostępniania, lepsze powiadomienia na Windowsie i kilka zmian, które po prostu ułatwiają codzienne korzystanie z aplikacji.',
      categories: [
        {
          kind: 'feature',
          label: 'Nowe funkcje',
          entries: [
            'Odkrywaj: nowy widok z wyszukiwarką oraz zakładkami Na czasie, Popularne i Sezonowe',
            'Losowe: nowa zakładka w Odkrywaj do szukania anime po wybranych i wykluczonych gatunkach',
            'Profil AniList: statystyki oglądania dostępne po wpisaniu nazwy użytkownika, bez logowania',
            'Karta profilu PNG: profil możesz skopiować albo zapisać jako obrazek do udostępnienia',
            'Biblioteka i dziennik: sortowanie biblioteki, sortowanie wpisów w dzienniku i losowanie anime z listy do obejrzenia',
          ],
        },
        {
          kind: 'polish',
          label: 'Ulepszenia',
          entries: [
            'Powiadomienia na Windowsie działają pewniej i mogą pojawić się nawet po zamknięciu aplikacji',
            'Emitowane dzisiaj: nowy, bardziej zwarty układ z poziomymi kartami i Twoimi seriami na początku',
            'Dock nawigacyjny: w ustawieniach można ukryć nieużywane widoki',
            'Motywy: zostało 18 bardziej wyraźnych presetów, a te zbyt podobne do siebie usunęliśmy',
            'O aplikacji: nowy przycisk do otwierania folderu z logami',
          ],
        },
      ],
    },
    en: {
      date: 'April 13, 2026',
      title: 'Discover anime, show off your profile, and get back to watching faster',
      description:
        'This update is mostly about everyday convenience. It adds a new Discover view, an AniList profile with a shareable card, more reliable notifications on Windows, and a few changes that simply make day-to-day use of the app easier.',
      categories: [
        {
          kind: 'feature',
          label: 'New features',
          entries: [
            'Discover: a new view with a search box and Trending, Popular and Seasonal tabs',
            'Random: a new tab inside Discover for finding anime by included and excluded genres',
            'AniList profile: viewing stats available after entering a username, no login required',
            'PNG profile card: copy your profile or save it as an image to share',
            'Library and diary: library sorting, diary entry sorting, and a random pick from your plan-to-watch list',
          ],
        },
        {
          kind: 'polish',
          label: 'Improvements',
          entries: [
            'Notifications on Windows are more reliable and can appear even after the app is closed',
            'Airing today: a new, more compact layout with horizontal cards and your series first',
            'Navigation dock: you can hide unused views in settings',
            'Themes: 18 more distinct presets remain, and the ones too similar to each other were removed',
            'About: a new button to open the logs folder',
          ],
        },
      ],
    },
  },
  {
    version: '0.4.2',
    shortDate: '10.04.2026',
    type: 'minor',
    pl: {
      date: '10 kwietnia 2026',
      title: 'Poprawki stabilności i wygody',
      description:
        'Kilka drobnych poprawek zauważonych podczas korzystania z aplikacji. Aplikacja na Windowsie zamyka się teraz poprawnie, linki otwierają się wewnątrz aplikacji, a onboarding nie pojawia się ponownie bez potrzeby.',
      categories: [
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Aplikacja na Windowsie zamyka się całkowicie zamiast pozostawać w tle w zasobniku systemowym',
            'Linki otwierają się teraz we wbudowanej przeglądarce zamiast w przeglądarce systemowej',
            'Onboarding nie pojawia się ponownie bez potrzeby',
            'Poprawione ścieżki do assetów maskotki i skryptów wewnętrznych',
            'Poprawiono zapisywanie logów aplikacji do pliku',
          ],
        },
      ],
    },
    en: {
      date: 'April 10, 2026',
      title: 'Stability and convenience fixes',
      description:
        'A handful of small fixes spotted while using the app. The app on Windows now quits properly, links open inside the app, and onboarding doesn’t reappear without reason.',
      categories: [
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'The app on Windows fully quits instead of lingering in the background in the system tray',
            'Links now open in the in-app browser instead of the system browser',
            'Onboarding doesn’t reappear without reason',
            'Fixed paths to mascot assets and internal scripts',
            'Fixed writing the app logs to a file',
          ],
        },
      ],
    },
  },
  {
    version: '0.4.1',
    shortDate: '09.04.2026',
    type: 'minor',
    pl: {
      date: '9 kwietnia 2026',
      title: 'Aktualizacja bezpieczeństwa',
      description:
        'Mała, ale ważna aktualizacja. Odświeżyliśmy kilka bibliotek, na których opiera się aplikacja, żeby zamknąć zgłoszone luki bezpieczeństwa. Nie ma tu nowych funkcji, ale warto zainstalować ją jak najszybciej. Aktualizacja pobierze się automatycznie.',
      categories: [
        {
          kind: 'security',
          label: 'Bezpieczeństwo',
          entries: [
            'Zaktualizowany silnik Electron, na którym działa ShiroAni. Zamknięte zostały luki związane z obsługą okien, uprawnieniami procesów i wczytywaniem obrazów ze schowka',
            'Zaktualizowane biblioteki odpowiadające za komunikację bota Discord i wewnętrzny silnik aplikacji desktopowej',
            'Odświeżone zależności narzędziowe używane podczas budowania aplikacji, bez zmian w działaniu dla użytkowników',
          ],
        },
      ],
    },
    en: {
      date: 'April 9, 2026',
      title: 'Security update',
      description:
        'A small but important update. We refreshed a few libraries the app relies on to close reported security vulnerabilities. There are no new features here, but it’s worth installing as soon as possible. The update will download automatically.',
      categories: [
        {
          kind: 'security',
          label: 'Security',
          entries: [
            'Updated the Electron engine ShiroAni runs on. Vulnerabilities related to window handling, process permissions and loading images from the clipboard were closed',
            'Updated the libraries behind the Discord bot’s communication and the desktop app’s internal engine',
            'Refreshed the tooling dependencies used while building the app, with no change in behavior for users',
          ],
        },
      ],
    },
  },
  {
    version: '0.4.0',
    shortDate: '08.04.2026',
    type: 'major',
    pl: {
      date: '8 kwietnia 2026',
      title: 'Blokowanie reklam popupowych i skróty klawiszowe',
      description:
        'Wbudowana przeglądarka stała się znacznie przyjemniejsza w użyciu. Doszło inteligentne blokowanie popupów reklamowych z iframe video playerów, pełna obsługa skrótów klawiszowych i naprawiona ikona w zasobniku systemowym.',
      categories: [
        {
          kind: 'feature',
          label: 'Nowe funkcje',
          entries: [
            'Inteligentne blokowanie popupów filtruje wywołania window.open na podstawie list filtrów i reguł pochodzenia (tryb smart/strict/off)',
            'Skróty klawiszowe przeglądarki: Ctrl+W (zamknij kartę), Ctrl+T (nowa karta), Ctrl+Tab (przełącz karty), Ctrl+L (pasek adresu), Ctrl+R (odśwież), Alt+←/→ (nawigacja)',
            'Dodatkowe filtry adblocka blokują banery cookies i nakładki z prośbą o wyłączenie blokady',
            'Przycisk trybu blokowania popupów w pasku narzędzi z trzema trybami i kolorowymi ikonami',
          ],
        },
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Naprawiono ikonę w zasobniku systemowym. W spakowanej aplikacji brakowało pliku icon-32.png, teraz używany jest icon.ico',
            'Skróty klawiszowe działają nawet gdy webview ma fokus (przechwytywanie przez before-input-event w procesie głównym)',
            'Logowanie do kont Google działa poprawnie dzięki Firefox UA dla domen autoryzacyjnych',
            'Discord RPC: timer sesji nie resetuje się przy zmianie widoku ani trybu bezczynności',
          ],
        },
      ],
    },
    en: {
      date: 'April 8, 2026',
      title: 'Pop-up ad blocking and keyboard shortcuts',
      description:
        'The in-app browser became much nicer to use. It gained smart blocking of pop-up ads from iframe video players, full keyboard-shortcut support, and a fixed system-tray icon.',
      categories: [
        {
          kind: 'feature',
          label: 'New features',
          entries: [
            'Smart pop-up blocking filters window.open calls based on filter lists and origin rules (smart / strict / off modes)',
            'Browser keyboard shortcuts: Ctrl+W (close tab), Ctrl+T (new tab), Ctrl+Tab (switch tabs), Ctrl+L (address bar), Ctrl+R (refresh), Alt+←/→ (navigation)',
            'Extra adblock filters block cookie banners and overlays asking you to disable the blocker',
            'A pop-up blocking mode button in the toolbar with three modes and colored icons',
          ],
        },
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'Fixed the system-tray icon. The packaged app was missing icon-32.png; it now uses icon.ico',
            'Keyboard shortcuts work even when the webview has focus (captured via before-input-event in the main process)',
            'Logging into Google accounts works correctly thanks to a Firefox UA for auth domains',
            'Discord RPC: the session timer no longer resets when changing views or entering idle mode',
          ],
        },
      ],
    },
  },
  {
    version: '0.3.2',
    shortDate: '06.04.2026',
    type: 'minor',
    pl: {
      date: '6 kwietnia 2026',
      title: 'Google login i poprawki maskotki',
      description:
        'Naprawiono blokadę logowania do kont Google w wbudowanej przeglądarce oraz błędy ładowania nakładki maskotki w trybie deweloperskim.',
      categories: [
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Logowanie do kont Google działa poprawnie, bo przeglądarka wysyła Firefox UA dla domen autoryzacyjnych Google',
            'Naprawiono ścieżki do plików HTML maskotki i menu kontekstowego (ERR_FILE_NOT_FOUND w dev)',
          ],
        },
      ],
    },
    en: {
      date: 'April 6, 2026',
      title: 'Google login and mascot fixes',
      description:
        'Fixed the Google account login block in the in-app browser, plus errors loading the mascot overlay in developer mode.',
      categories: [
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'Logging into Google accounts works correctly because the browser sends a Firefox UA for Google auth domains',
            'Fixed paths to the mascot and context-menu HTML files (ERR_FILE_NOT_FOUND in dev)',
          ],
        },
      ],
    },
  },
  {
    version: '0.3.1',
    shortDate: '06.04.2026',
    type: 'minor',
    pl: {
      date: '6 kwietnia 2026',
      title: 'Discord RPC: ciągły timer sesji',
      description:
        'Czas wyświetlany w Discord Rich Presence teraz pokazuje całkowity czas od uruchomienia aplikacji, zamiast resetować się przy zmianie widoku lub przejściu w tryb bezczynności.',
      categories: [
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Discord RPC: timer sesji nie resetuje się już przy zmianie widoku ani przy przejściu w i z trybu bezczynności',
          ],
        },
      ],
    },
    en: {
      date: 'April 6, 2026',
      title: 'Discord RPC: continuous session timer',
      description:
        'The time shown in Discord Rich Presence now displays the total time since the app launched, instead of resetting when you change views or go idle.',
      categories: [
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'Discord RPC: the session timer no longer resets when changing views or entering and leaving idle mode',
          ],
        },
      ],
    },
  },
  {
    version: '0.3.0',
    shortDate: '27.03.2026',
    type: 'major',
    pl: {
      date: '27 marca 2026',
      title: 'Czytelność i szczegóły anime',
      description:
        'Nowe narzędzia do personalizacji interfejsu i szybszego dostępu do informacji o anime: skalowanie czcionek, dialog szczegółów anime w harmonogramie i przywrócone linki do repozytorium.',
      categories: [
        {
          kind: 'feature',
          label: 'Nowe funkcje',
          entries: [
            'Skalowanie czytelności: zmiana rozmiaru czcionek w ustawieniach aplikacji',
            'Kliknięcie karty w harmonogramie otwiera dialog ze szczegółami anime',
          ],
        },
        {
          kind: 'fix',
          label: 'Poprawki',
          entries: [
            'Naprawiono hydration mismatch przy inicjalizacji skali czcionek',
            'Przywrócono linki do GitHuba w stopce i konsoli strony głównej',
          ],
        },
      ],
    },
    en: {
      date: 'March 27, 2026',
      title: 'Readability and anime details',
      description:
        'New tools for personalizing the interface and getting to anime info faster: font scaling, an anime details dialog in the schedule, and restored links to the repository.',
      categories: [
        {
          kind: 'feature',
          label: 'New features',
          entries: [
            'Readability scaling: change the font size in the app settings',
            'Clicking a card in the schedule opens a dialog with anime details',
          ],
        },
        {
          kind: 'fix',
          label: 'Fixes',
          entries: [
            'Fixed a hydration mismatch when initializing the font scale',
            'Restored the GitHub links in the footer and the landing page console',
          ],
        },
      ],
    },
  },
  {
    version: '0.2.1',
    shortDate: '19.03.2026',
    type: 'minor',
    pl: {
      date: '19 marca 2026',
      title: 'Stabilizacja i poprawki',
      description:
        'Wydanie poprawkowe skupione na dopracowaniu nowego widoku Aktualności i usunięciu najbardziej uciążliwych problemów na macOS, od stanów ładowania RSS po zachowanie maskotki, Docka i okna aplikacji.',
      categories: [
        {
          kind: 'feed',
          label: 'Feed i RSS',
          entries: [
            'Ekran ładowania Aktualności poprawnie pokazuje się przy pustym cache i pierwszym otwarciu widoku',
            'Dodano ustawienie odświeżania RSS przy starcie aplikacji, domyślnie wyłączone',
            'Wygładzono renderowanie kart feedu i wzmocniono czytelność animacji ładowania',
            'Pierwsze pobieranie feedu jest teraz bardziej przewidywalne i łatwiejsze do testowania',
          ],
        },
        {
          kind: 'macos',
          label: 'macOS i maskotka',
          entries: [
            'Naprawiono problem z maskotką w fullscreen, Spaces i przy przełączaniu aplikacji przez Cmd+Tab',
            'Tryb „Tylko przy zminimalizowanej aplikacji" działa teraz zgodnie z opisem',
            'Menu kontekstowe maskotki znów poprawnie otwiera ShiroAni',
            'Kliknięcie ikony w Docku po zamknięciu czerwonym przyciskiem ponownie pokazuje okno aplikacji',
          ],
        },
      ],
    },
    en: {
      date: 'March 19, 2026',
      title: 'Stabilization and fixes',
      description:
        'A patch release focused on polishing the new News view and clearing the most annoying problems on macOS — from RSS loading states to the behavior of the mascot, the Dock and the app window.',
      categories: [
        {
          kind: 'feed',
          label: 'Feed & RSS',
          entries: [
            'The News loading screen shows correctly with an empty cache and on first opening the view',
            'Added a setting to refresh RSS on app startup, off by default',
            'Smoothed out feed card rendering and made the loading animation more legible',
            'The first feed fetch is now more predictable and easier to test',
          ],
        },
        {
          kind: 'macos',
          label: 'macOS & mascot',
          entries: [
            'Fixed the mascot issue in fullscreen, Spaces and when switching apps with Cmd+Tab',
            'The “Only when the app is minimized” mode now works as described',
            'The mascot context menu opens ShiroAni correctly again',
            'Clicking the Dock icon after a red-button close shows the app window again',
          ],
        },
      ],
    },
  },
  {
    version: '0.2.0',
    shortDate: '19.03.2026',
    type: 'major',
    pl: {
      date: '19 marca 2026',
      title: 'Anime News Feed',
      description:
        'ShiroAni agreguje teraz wiadomości ze świata anime z 11 źródeł RSS, po angielsku i po polsku. Nowy widok „Aktualności" pozwala być na bieżąco z newsami, premierami odcinków i recenzjami.',
      categories: [
        {
          kind: 'feed',
          label: 'Nowy widok: Aktualności',
          entries: [
            'Agregacja RSS z 11 źródeł: ANN, MAL, Crunchyroll, Anime Corner, LiveChart, AnimeSchedule, Animeholik, Anime.com.pl, Rascal.pl, Monime.pl i ANN Reviews',
            'Filtrowanie po kategorii (Wiadomości, Odcinki, Recenzje) i języku (EN/PL)',
            'Animowana scena ładowania z sygnałem RSS, unoszącymi się kartami i efektami iskierek',
            'Automatyczne odpytywanie źródeł w tle z konfigurowalnymi interwałami',
            'Karty z obrazkami, odznakami źródeł w kolorach marki i tagami kategorii',
            'Kliknięcie otwiera artykuł w wbudowanej przeglądarce',
          ],
        },
        {
          kind: 'polish',
          label: 'Poprawki i ulepszenia',
          entries: [
            'Naprawiono powiadomienia o odcinkach: autozapis ustawień i wyłapywanie pominiętych odcinków',
            'Naprawiono ostrzeżenie MaxListenersExceeded w adapterze Socket.IO',
            'Naprawiono nieobsłużone odrzucenie promise w menu kontekstowym maskotki',
            'Zmiana trybu widoczności maskotki teraz natychmiast pokazuje/ukrywa overlay',
          ],
        },
      ],
    },
    en: {
      date: 'March 19, 2026',
      title: 'Anime News Feed',
      description:
        'ShiroAni now aggregates anime news from 11 RSS sources, in both English and Polish. The new “News” view lets you stay up to date with the latest news, episode releases and reviews.',
      categories: [
        {
          kind: 'feed',
          label: 'New view: News',
          entries: [
            'RSS aggregation from 11 sources: ANN, MAL, Crunchyroll, Anime Corner, LiveChart, AnimeSchedule, Animeholik, Anime.com.pl, Rascal.pl, Monime.pl and ANN Reviews',
            'Filtering by category (News, Episodes, Reviews) and language (EN/PL)',
            'An animated loading scene with an RSS signal, floating cards and sparkle effects',
            'Automatic background polling of sources with configurable intervals',
            'Cards with images, brand-colored source badges and category tags',
            'Clicking opens the article in the in-app browser',
          ],
        },
        {
          kind: 'polish',
          label: 'Fixes & improvements',
          entries: [
            'Fixed episode notifications: auto-saving settings and catching missed episodes',
            'Fixed the MaxListenersExceeded warning in the Socket.IO adapter',
            'Fixed an unhandled promise rejection in the mascot context menu',
            'Changing the mascot visibility mode now shows/hides the overlay immediately',
          ],
        },
      ],
    },
  },
  {
    version: '0.1.0',
    shortDate: '17.03.2026',
    type: 'major',
    pl: {
      date: '17 marca 2026',
      title: 'Pierwsze wydanie',
      description:
        'Wszystko zaczęło się od prostego pytania: a co, gdyby śledzenie anime było wygodne? Tak powstał pierwszy publiczny build ShiroAni.',
      categories: [
        {
          kind: 'app',
          label: 'Aplikacja desktopowa',
          entries: [
            'Wbudowana przeglądarka z adblockiem (EasyList + EasyPrivacy) i obsługą kart',
            'Discord Rich Presence: automatyczne wykrywanie anime z ogladajanime.pl, shinden.pl i YouTube',
            'Biblioteka anime z ręcznym dodawaniem, statusami i ocenami',
            'Harmonogram anime z odliczaniem do nowych odcinków',
            'Dziennik: osobiste notatki o oglądanych seriach',
            'Maskotka Shiro-chan z trzema pozami (powitanie, myślenie, sen)',
            'Kreator pierwszego uruchomienia: konfiguracja krok po kroku',
            'Ikona w zasobniku systemowym, autostart i ekran startowy z animacjami',
          ],
        },
        {
          kind: 'bot',
          label: 'Bot Discord',
          entries: [
            'Moderacja: /ban, /unban, /mute, /unmute, /clear z pełnym audytem',
            'System XP i poziomów: /rank, /leaderboard, role za poziomy',
            'Role reakcji: /rr-create, /rr-add, /rr-remove, /rr-list',
            'System weryfikacji: przycisk z auto-rolą',
            'Wiadomości powitalne/pożegnalne z konfigurowalnym kanałem',
            '/post: kreator embedów w oknie modalnym (tytuł, opis, kolor, obraz, stopka)',
            'Dziennik audytowy: automatyczne logi usunięć i edycji wiadomości',
          ],
        },
      ],
    },
    en: {
      date: 'March 17, 2026',
      title: 'First release',
      description:
        'It all started with a simple question: what if tracking anime was actually comfortable? That’s how the first public build of ShiroAni came to be.',
      categories: [
        {
          kind: 'app',
          label: 'Desktop app',
          entries: [
            'Built-in browser with adblock (EasyList + EasyPrivacy) and tab support',
            'Discord Rich Presence: automatic anime detection from ogladajanime.pl, shinden.pl and YouTube',
            'Anime library with manual adding, statuses and ratings',
            'Anime schedule with a countdown to new episodes',
            'Diary: personal notes about the series you watch',
            'Shiro-chan mascot with three poses (greeting, thinking, sleeping)',
            'First-run wizard: step-by-step configuration',
            'System-tray icon, autostart and an animated splash screen',
          ],
        },
        {
          kind: 'bot',
          label: 'Discord bot',
          entries: [
            'Moderation: /ban, /unban, /mute, /unmute, /clear with a full audit trail',
            'XP and level system: /rank, /leaderboard, level roles',
            'Reaction roles: /rr-create, /rr-add, /rr-remove, /rr-list',
            'Verification system: a button with an auto-role',
            'Welcome/farewell messages with a configurable channel',
            '/post: an embed builder in a modal (title, description, color, image, footer)',
            'Audit log: automatic logs of message deletions and edits',
          ],
        },
      ],
    },
  },
];
