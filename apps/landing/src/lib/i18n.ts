import {
  BUILT_IN_THEME_METADATA,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@shiroani/shared';

export {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  type SupportedLanguage,
};

/**
 * Inline dictionary for the Astro landing page. The landing intentionally
 * does NOT use i18next — strings are swapped on the client by walking
 * `[data-i18n]` nodes after first paint. PL is the canonical content
 * (the landing was authored in Polish); EN is a faithful translation.
 */
export const translations: Record<SupportedLanguage, Record<string, string>> = {
  pl: {
    // Layout
    'layout.skipToContent': 'Przejdź do treści',

    // Title + description (applied to <title> and <meta name="description">)
    'meta.home.title': '白アニ · ShiroAni — przeglądarka i tracker anime',
    'meta.home.description':
      'ShiroAni to aplikacja na komputer: przeglądarka bez reklam, biblioteka, harmonogram emisji i pamiętnik.',
    'meta.home.ogTitle': 'ShiroAni · przeglądarka i tracker anime',
    'meta.changelog.title': 'Lista zmian · ShiroAni',
    'meta.changelog.description':
      'Historia zmian w ShiroAni — funkcja po funkcji, poprawka po poprawce.',
    'meta.download.title': 'Pobierz · ShiroAni',
    'meta.download.description':
      'Pobierz najnowszą wersję ShiroAni — przeglądarkę i tracker anime. Windows i macOS.',
    'meta.404.title': '404 · Strona nie znaleziona — ShiroAni',
    'meta.404.description':
      'Ta strona nie istnieje albo została przeniesiona. Wróć na stronę główną ShiroAni.',

    // 404 page
    'notfound.mascotAlt': 'Shiro-chan zamyślona',
    'notfound.title': 'Strona nie znaleziona',
    'notfound.body':
      'Hmm… Shiro-chan szukała tej strony na każdej półce, ale jej nie ma. Może została przeniesiona albo nigdy nie istniała.',
    'notfound.cta': 'Wróć na stronę główną',

    // Navbar
    'nav.primary': 'Nawigacja główna',
    'nav.features': 'Funkcje',
    'nav.mascot': 'Shiro-chan',
    'nav.faq': 'FAQ',
    'nav.download': 'Pobierz',
    'nav.changelog': 'Zmiany',
    'nav.home': 'Start',
    'nav.cta': 'Pobierz',
    'nav.toggleMenu': 'Menu',
    'nav.github': 'GitHub',
    'nav.switchLanguage': 'Zmień język',
    'nav.switchLanguageToPl': 'Przełącz na polski',
    'nav.switchLanguageToEn': 'Przełącz na angielski',

    // Chapters
    'chapter.01.eyebrow': 'Chapter one · Poza wyspą',
    'chapter.01.title': 'I jeszcze ',
    'chapter.01.em': 'kilka rzeczy',
    'chapter.01.titleSuffix': '.',
    'chapter.01.meta': '5 funkcji<br />№ 05 do 09',
    'chapter.02.eyebrow': 'Chapter two · Mała towarzyszka',
    'chapter.02.title': 'Poznaj ',
    'chapter.02.em': 'Shiro-chan',
    'chapter.02.titleSuffix': '.',
    'chapter.02.meta': '8+ póz',
    'chapter.03.eyebrow': 'Chapter three · Pytania',
    'chapter.03.title': 'Krótko i ',
    'chapter.03.em': 'na temat',
    'chapter.03.titleSuffix': '.',
    'chapter.03.meta': '6 pytań',

    // Features
    'features.05.no': '№ 05 · DISCORD RPC',
    'features.05.tag': 'TEMPLATE EDITOR',
    'features.05.title': 'Pokaż znajomym, co oglądasz.',
    'features.05.desc':
      'Rich Presence z własnym szablonem. Podgląd na żywo w ustawieniach. Edytujesz tekst, obrazki, akcje.',
    'features.05.alt': 'Discord Rich Presence',
    'features.06.no': '№ 06 · NEW TAB',
    'features.06.title': 'Ulubione strony pod jednym kliknięciem.',
    'features.06.desc': 'Kafelki szybkiego dostępu. Raz skonfigurujesz, masz na zawsze.',
    'features.06.alt': 'Nowa karta',
    'features.07.no': '№ 07 · THEMES',
    'features.07.title': '{themeCount} motywów plus edytor własnych.',
    'features.07.desc':
      '{darkCount} ciemnych, {lightCount} jasne, większość inspirowana anime. Wizualny edytor palety, czcionek i tła.',
    'features.08.no': '№ 08 · NOTIFICATIONS',
    'features.08.title': 'Nowy odcinek? Jesteś pierwszy.',
    'features.08.desc':
      'Powiadomienia systemowe, gdy tylko któraś seria z biblioteki dostaje nowy odcinek.',
    'features.09.no': '№ 09 · IMPORT / EXPORT',
    'features.09.title': 'Twoje dane należą do Ciebie.',
    'features.09.desc':
      'Lokalne SQLite. Import i eksport biblioteki i pamiętnika jednym kliknięciem. Bez chmury, bez konta.',

    // Mascot
    'mascot.title.lead': 'Mała towarzyszka',
    'mascot.title.em': 'na Twoim pulpicie.',
    'mascot.body':
      'Shiro-chan siedzi w rogu okna i dotrzymuje Ci towarzystwa. Przeciągnij ją, gdzie chcesz — i tam zostanie. Kolejne pozy i reakcje dojdą w następnych wydaniach.',
    'mascot.alt': 'Shiro-chan',

    // At a glance (end of the homepage)
    'glance.label': 'W skrócie',
    'glance.free.title': 'Za darmo',
    'glance.free.body': 'Bez wersji premium i okresu próbnego.',
    'glance.platforms.title': 'Dwa systemy',
    'glance.platforms.body': 'Windows i macOS.',
    'glance.account.title': 'Bez konta',
    'glance.account.body': 'Biblioteka zostaje na Twoim komputerze.',
    'glance.anilist.title': 'AniList w środku',
    'glance.anilist.body': 'Harmonogram i odkrywanie nowych serii.',

    // Download line (end of the homepage)
    'download.title': 'Pobierz ShiroAni',
    'download.minor.released': 'wydanie z',

    // FAQ
    'faq.heading.lead': 'Najczęstsze ',
    'faq.heading.em': 'pytania',
    'faq.heading.tail': '.',
    'faq.sub': 'Masz inne pytanie? Napisz do nas na GitHubie.',
    'faq.q1': 'Czy ShiroAni jest darmowe?',
    'faq.a1':
      'Tak, całkowicie. Żadnego konta, reklam, ani subskrypcji. Kod jest otwarty do wglądu, ale nie wolno go redystrybuować.',
    'faq.q2': 'Na jakich systemach działa?',
    'faq.a2':
      'Windows 10/11 (auto-update) i macOS 11+. Żadna z wersji nie jest podpisana: Windows pokaże ostrzeżenie SmartScreen (kliknij „Więcej informacji" → „Uruchom mimo to"), a na macOS po każdym pobraniu trzeba uruchomić <code>xattr -rd com.apple.quarantine /Applications/ShiroAni.app</code>, bo macOS nakłada kwarantannę na każdy świeżo pobrany plik.',
    'faq.q3': 'Jak działa wbudowana przeglądarka?',
    'faq.a3':
      'Pełna przeglądarka na Chromium z wbudowanym adblockiem Ghostery. Karty, sesje, zakładki, historia — działa jak zwykła przeglądarka, tylko bez reklam i w tym samym oknie co biblioteka.',
    'faq.q4': 'Skąd dane w harmonogramie?',
    'faq.a4':
      'Harmonogram pobiera dane bezpośrednio z publicznego API AniList. Dwukierunkowa synchronizacja biblioteki z AniList i MyAnimeList jest już dostępna (oznaczona jako eksperymentalna).',
    'faq.q5': 'Czy moje dane są bezpieczne?',
    'faq.a5':
      'Wszystkie dane (biblioteka, pamiętnik, ustawienia) są lokalne — SQLite na Twoim dysku. Nie wysyłamy niczego na serwer.',
    'faq.q6': 'Interfejs jest tylko po polsku?',
    'faq.a6':
      'Polski i angielski. Aby zmienić język interfejsu aplikacji, otwórz Ustawienia → Ogólne w aplikacji.',

    // Footer
    'footer.blurb':
      'Shiro-chan dorosła. Stabilna, dopracowana i bezpłatna — a z każdym wydaniem robi się przytulniej.',
    'footer.col.product': 'Produkt',
    'footer.col.resources': 'Zasoby',
    'footer.link.features': 'Funkcje',
    'footer.link.download': 'Pobierz',
    'footer.link.changelog': 'Lista zmian',
    'footer.link.faq': 'FAQ',
    'footer.link.github': 'GitHub',
    'footer.link.discord': 'Discord',
    'footer.family.lead': 'Część małej rodziny z ',
    'footer.family.music': ' do muzyki i ',
    'footer.family.manga': ' do mangi.',
    'footer.copyright': 'Wszelkie prawa zastrzeżone',
    'footer.tagline': '白 · アニ · Made with ♥ in Poland',

    // Download page (React island)
    'dlp.eyebrow.released': 'wydanie z',
    'dlp.heading.lead': 'Pobierz',
    'dlp.heading.em': 'ShiroAni',
    'dlp.heading.tail': '.',
    'dlp.sub':
      'Za darmo, bez konta, bez reklam. Na Windowsie aktualizuje się sama. Żadna wersja nie jest jeszcze podpisana, szczegóły o SmartScreen i macOS znajdziesz niżej.',
    'dlp.aria.section': 'Pobieranie',
    'dlp.error.message':
      'Nie udało się pobrać informacji o najnowszej wersji. Plik znajdziesz w wydaniach na GitHubie.',
    'dlp.error.cta': 'Otwórz GitHub Releases',
    'dlp.platform.win': 'Windows',
    'dlp.platform.mac': 'macOS',
    'dlp.aria.download': 'Pobierz {platform}, {ext}, {size}',
    'dlp.aria.openRelease': 'Otwórz stronę wydania dla {platform}',
    'dlp.your': 'Twój system',
    'dlp.notAvailable': 'Brak pliku dla tej platformy, zajrzyj do wydania',
    'dlp.loading': 'wczytywanie…',
    'dlp.sr.started': 'Pobieranie {platform} rozpoczęte.',
    'dlp.note.win.title': 'Windows · SmartScreen',
    'dlp.note.win.body.lead':
      'Instalator nie ma certyfikatu EV, więc Windows SmartScreen wyświetli ostrzeżenie',
    'dlp.note.win.body.warn': '„System Windows ochronił Twój komputer"',
    'dlp.note.win.body.tail': '. Kliknij',
    'dlp.note.win.body.more': 'Więcej informacji',
    'dlp.note.win.body.then': ', a potem',
    'dlp.note.win.body.run': 'Uruchom mimo to',
    'dlp.note.win.body.dot': '.',
    'dlp.note.win.meta':
      'Po instalacji aplikacja aktualizuje się sama. Ostrzeżenie zobaczysz tylko przy pierwszym uruchomieniu.',
    'dlp.note.mac.title': 'macOS · po każdym pobraniu',
    'dlp.note.mac.body.lead':
      'Aplikacja nie ma certyfikatu Apple, więc macOS zablokuje ją przy pierwszym uruchomieniu. Po przeniesieniu ShiroAni do folderu',
    'dlp.note.mac.body.applications': 'Applications',
    'dlp.note.mac.body.tail': 'wklej w terminalu:',
    'dlp.note.mac.copy': 'Kopiuj',
    'dlp.note.mac.copied': 'Skopiowano',
    'dlp.note.mac.copyAria': 'Skopiuj komendę',
    'dlp.note.mac.meta':
      'Powtarzaj tę komendę po każdej aktualizacji. macOS oznacza kwarantanną każdy świeżo pobrany plik.',
    'dlp.links.changelog': 'Lista zmian',
    'dlp.links.fullRelease': 'Pełne wydanie na GitHubie',
    'dlp.dateLocale': 'pl-PL',

    // Changelog page
    'changelog.eyebrow.version': 'v',
    'changelog.heading.lead': 'Co ',
    'changelog.heading.em': 'nowego',
    'changelog.heading.tail': '?',
    'changelog.sub':
      'Historia zmian w ShiroAni: funkcja po funkcji, poprawka po poprawce. Od pierwszego buildu po ostatni wieczór w bibliotece.',
    'changelog.filter.label': 'Filtr',
    'changelog.filter.all': 'Wszystkie',
    'changelog.filter.major': 'Większe wydania',
    'changelog.filter.minor': 'Patche',
    'changelog.badge.latest': 'Najnowsza',
    'changelog.end.tag': 'Początek · 2026',
    'changelog.end.quote': '„A co, gdyby śledzenie anime było wygodne?"',

    // Island (3D preview page)
    'island.dots': 'Przystanki na wyspie',
    'island.porch.label': 'Ganek',
    'island.porch.title': 'Twój przytulny kąt na wszystko, co anime.',
    'island.porch.body':
      'Oglądaj bez reklam, prowadź swoją półkę, łap każdy emitowany odcinek i pisz pamiętnik. Jedna darmowa aplikacja na komputer.',
    'island.porch.download': 'Pobierz',
    'island.porch.explore': 'Zwiedź wyspę',
    'island.pullback.label': 'Wyspa',
    'island.pullback.title': 'Na wyspie wszystko ma swoje miejsce.',
    'island.library.label': 'Biblioteka',
    'island.library.title': 'Każda seria na jednej półce.',
    'island.library.body':
      'Oglądane, ukończone, planowane, wstrzymane, porzucone. Filtry, notatki i postęp odcinków dla każdego tytułu.',
    'island.schedule.label': 'Harmonogram',
    'island.schedule.title': 'Wiesz, kiedy wyjdzie kolejny odcinek.',
    'island.schedule.body':
      'Tydzień emisji z odliczaniem do każdego odcinka, prosto z AniList, i powiadomienie, gdy tylko się pojawi.',
    'island.diary.label': 'Pamiętnik',
    'island.diary.title': 'Zapisz, jak to było.',
    'island.diary.body':
      'Pamiętnik z nagłówkami, obrazkami i formatowaniem do każdego odcinka. Zostaje na Twoim komputerze.',
    'island.browser.label': 'Przeglądarka',
    'island.browser.title': 'Przeglądarka, w której nie przeszkadzają reklamy.',
    'island.browser.body':
      'Karty, zakładki i blokada reklam Ghostery w tym samym oknie, w którym oglądasz. Żadnych pop-upów ani przekierowań.',
    'island.moon.label': 'Księżyc',
    'island.moon.title': 'Zabierz ją dziś do siebie.',
    'island.moon.windows': 'Pobierz na Windows',
    'island.moon.macos': 'Pobierz na macOS',
    'island.moon.changelog': 'Lista zmian',
  },
  en: {
    // Layout
    'layout.skipToContent': 'Skip to content',

    // Title + description
    'meta.home.title': '白アニ · ShiroAni — anime browser & tracker',
    'meta.home.description':
      'ShiroAni is a desktop app: an ad-free browser, library, airing schedule, and diary.',
    'meta.home.ogTitle': 'ShiroAni · anime browser & tracker',
    'meta.changelog.title': 'Changelog · ShiroAni',
    'meta.changelog.description': 'ShiroAni release history — feature by feature, fix by fix.',
    'meta.download.title': 'Download · ShiroAni',
    'meta.download.description':
      'Download the latest ShiroAni — anime browser & tracker. Windows and macOS.',
    'meta.404.title': '404 · Page not found — ShiroAni',
    'meta.404.description':
      'This page doesn’t exist or has been moved. Head back to the ShiroAni home page.',

    // 404 page
    'notfound.mascotAlt': 'Shiro-chan, lost in thought',
    'notfound.title': 'Page not found',
    'notfound.body':
      'Hmm… Shiro-chan searched every shelf for this page, but it isn’t here. Maybe it was moved, or never existed at all.',
    'notfound.cta': 'Back to home',

    // Navbar
    'nav.primary': 'Primary navigation',
    'nav.features': 'Features',
    'nav.mascot': 'Shiro-chan',
    'nav.faq': 'FAQ',
    'nav.download': 'Download',
    'nav.changelog': 'Changelog',
    'nav.home': 'Home',
    'nav.cta': 'Download',
    'nav.toggleMenu': 'Menu',
    'nav.github': 'GitHub',
    'nav.switchLanguage': 'Switch language',
    'nav.switchLanguageToPl': 'Switch to Polish',
    'nav.switchLanguageToEn': 'Switch to English',

    // Chapters
    'chapter.01.eyebrow': 'Chapter one · Beyond the island',
    'chapter.01.title': 'And a few ',
    'chapter.01.em': 'more things',
    'chapter.01.titleSuffix': '.',
    'chapter.01.meta': '5 features<br />№ 05 to 09',
    'chapter.02.eyebrow': 'Chapter two · A small companion',
    'chapter.02.title': 'Meet ',
    'chapter.02.em': 'Shiro-chan',
    'chapter.02.titleSuffix': '.',
    'chapter.02.meta': '8+ poses',
    'chapter.03.eyebrow': 'Chapter three · Questions',
    'chapter.03.title': 'Short and ',
    'chapter.03.em': 'to the point',
    'chapter.03.titleSuffix': '.',
    'chapter.03.meta': '6 questions',

    // Features
    'features.05.no': '№ 05 · DISCORD RPC',
    'features.05.tag': 'TEMPLATE EDITOR',
    'features.05.title': 'Show your friends what you’re watching.',
    'features.05.desc':
      'Rich Presence with your own template. Live preview in settings. Edit the text, images, actions.',
    'features.05.alt': 'Discord Rich Presence',
    'features.06.no': '№ 06 · NEW TAB',
    'features.06.title': 'Favorite sites a single click away.',
    'features.06.desc': 'Quick-access tiles. Set them once, keep them forever.',
    'features.06.alt': 'New tab',
    'features.07.no': '№ 07 · THEMES',
    'features.07.title': '{themeCount} themes plus a custom theme editor.',
    'features.07.desc':
      '{darkCount} dark, {lightCount} light, mostly anime-inspired. A visual editor for palette, fonts and background.',
    'features.08.no': '№ 08 · NOTIFICATIONS',
    'features.08.title': 'New episode? You’re first to know.',
    'features.08.desc':
      'Native system notifications the moment any series in your library gets a new episode.',
    'features.09.no': '№ 09 · IMPORT / EXPORT',
    'features.09.title': 'Your data is yours.',
    'features.09.desc':
      'Local SQLite. Import and export your library and diary in one click. No cloud, no account.',

    // Mascot
    'mascot.title.lead': 'A small companion',
    'mascot.title.em': 'on your desktop.',
    'mascot.body':
      'Shiro-chan sits in the corner of the window and keeps you company. Drag her wherever you like — she stays. More poses and reactions are coming in future releases.',
    'mascot.alt': 'Shiro-chan',

    // At a glance (end of the homepage)
    'glance.label': 'At a glance',
    'glance.free.title': 'Free',
    'glance.free.body': 'No tiers, no trial.',
    'glance.platforms.title': 'Two desktops',
    'glance.platforms.body': 'Windows and macOS.',
    'glance.account.title': 'No account',
    'glance.account.body': 'Your library stays local.',
    'glance.anilist.title': 'AniList inside',
    'glance.anilist.body': 'Schedules and discovery.',

    // Download line (end of the homepage)
    'download.title': 'Get ShiroAni',
    'download.minor.released': 'released on',

    // FAQ
    'faq.heading.lead': 'Frequently asked ',
    'faq.heading.em': 'questions',
    'faq.heading.tail': '.',
    'faq.sub': 'Got another question? Reach out on GitHub.',
    'faq.q1': 'Is ShiroAni free?',
    'faq.a1':
      'Yes, completely. No account, no ads, no subscription. The source is available to read but not to redistribute.',
    'faq.q2': 'Which systems does it run on?',
    'faq.a2':
      'Windows 10/11 (auto-update) and macOS 11+. Neither build is signed: Windows shows a SmartScreen warning (click "More info" → "Run anyway"), and on macOS you have to run <code>xattr -rd com.apple.quarantine /Applications/ShiroAni.app</code> after every download because macOS quarantines anything fresh off the internet.',
    'faq.q3': 'How does the built-in browser work?',
    'faq.a3':
      'A full Chromium browser with Ghostery ad-blocking baked in. Tabs, sessions, bookmarks, history — it works like a normal browser, just without the ads and in the same window as the library.',
    'faq.q4': 'Where does the schedule data come from?',
    'faq.a4':
      'The schedule pulls directly from the public AniList API. Two-way library sync with AniList and MyAnimeList is available now (marked experimental).',
    'faq.q5': 'Is my data safe?',
    'faq.a5':
      'All data (library, diary, settings) is local — SQLite on your disk. Nothing is sent to a server.',
    'faq.q6': 'Is the interface only in Polish?',
    'faq.a6':
      "Polish and English. To switch the app's UI language, open Settings → General inside the app.",

    // Footer
    'footer.blurb':
      'Shiro-chan is all grown up. Stable, polished, and free — and every release makes it cozier.',
    'footer.col.product': 'Product',
    'footer.col.resources': 'Resources',
    'footer.link.features': 'Features',
    'footer.link.download': 'Download',
    'footer.link.changelog': 'Changelog',
    'footer.link.faq': 'FAQ',
    'footer.link.github': 'GitHub',
    'footer.link.discord': 'Discord',
    'footer.family.lead': 'Part of a small family with ',
    'footer.family.music': ' for music and ',
    'footer.family.manga': ' for manga.',
    'footer.copyright': 'All rights reserved',
    'footer.tagline': '白 · アニ · Made with ♥ in Poland',

    // Download page
    'dlp.eyebrow.released': 'released on',
    'dlp.heading.lead': 'Download',
    'dlp.heading.em': 'ShiroAni',
    'dlp.heading.tail': '.',
    'dlp.sub':
      'Free, no account, no ads. Auto-updates on Windows. Neither build is signed yet — SmartScreen and macOS notes are below.',
    'dlp.aria.section': 'Download',
    'dlp.error.message':
      'Could not load the latest release. You can find the file in GitHub Releases.',
    'dlp.error.cta': 'Open GitHub Releases',
    'dlp.platform.win': 'Windows',
    'dlp.platform.mac': 'macOS',
    'dlp.aria.download': 'Download {platform}, {ext}, {size}',
    'dlp.aria.openRelease': 'Open the release page for {platform}',
    'dlp.your': 'Your system',
    'dlp.notAvailable': 'No file for this platform — check the release page',
    'dlp.loading': 'loading…',
    'dlp.sr.started': '{platform} download started.',
    'dlp.note.win.title': 'Windows · SmartScreen',
    'dlp.note.win.body.lead':
      'The installer has no EV certificate, so Windows SmartScreen will show a warning',
    'dlp.note.win.body.warn': '"Windows protected your PC"',
    'dlp.note.win.body.tail': '. Click',
    'dlp.note.win.body.more': 'More info',
    'dlp.note.win.body.then': ', then',
    'dlp.note.win.body.run': 'Run anyway',
    'dlp.note.win.body.dot': '.',
    'dlp.note.win.meta':
      'After install the app updates itself. You only see the warning the first time.',
    'dlp.note.mac.title': 'macOS · after every download',
    'dlp.note.mac.body.lead':
      'The app has no Apple certificate, so macOS will block it on first launch. After moving ShiroAni to your',
    'dlp.note.mac.body.applications': 'Applications',
    'dlp.note.mac.body.tail': 'folder, paste in Terminal:',
    'dlp.note.mac.copy': 'Copy',
    'dlp.note.mac.copied': 'Copied',
    'dlp.note.mac.copyAria': 'Copy command',
    'dlp.note.mac.meta':
      'Repeat this command after every update. macOS quarantines every freshly downloaded file.',
    'dlp.links.changelog': 'Changelog',
    'dlp.links.fullRelease': 'Full release on GitHub',
    'dlp.dateLocale': 'en-US',

    // Changelog
    'changelog.eyebrow.version': 'v',
    'changelog.heading.lead': 'What’s ',
    'changelog.heading.em': 'new',
    'changelog.heading.tail': '?',
    'changelog.sub':
      'ShiroAni release history: feature by feature, fix by fix. From the first build to the latest evening in the library.',
    'changelog.filter.label': 'Filter',
    'changelog.filter.all': 'All',
    'changelog.filter.major': 'Major releases',
    'changelog.filter.minor': 'Patches',
    'changelog.badge.latest': 'Latest',
    'changelog.end.tag': 'Beginning · 2026',
    'changelog.end.quote': '"What if tracking anime were comfortable?"',

    // Island (3D preview page)
    'island.dots': 'Stops on the island',
    'island.porch.label': 'Porch',
    'island.porch.title': 'Your cozy corner for all things anime.',
    'island.porch.body':
      'Watch without ads, track your shelf, catch every airing episode and keep a diary. One free desktop app.',
    'island.porch.download': 'Download',
    'island.porch.explore': 'Explore the island',
    'island.pullback.label': 'Island',
    'island.pullback.title': 'Everything has its place on the island.',
    'island.library.label': 'Library',
    'island.library.title': 'Every show on one shelf.',
    'island.library.body':
      'Watching, completed, planned, on hold, dropped. Filters, notes and episode progress for each title.',
    'island.schedule.label': 'Schedule',
    'island.schedule.title': 'Know when the next episode lands.',
    'island.schedule.body':
      'The week of airing episodes with a countdown to each one, from AniList, and a notification when it drops.',
    'island.diary.label': 'Diary',
    'island.diary.title': 'Write down how it felt.',
    'island.diary.body':
      'A journal with headings, images and formatting for every episode. It stays on your computer.',
    'island.browser.label': 'Browser',
    'island.browser.title': 'A browser with no ads in the way.',
    'island.browser.body':
      'Tabs, bookmarks and Ghostery ad blocking, in the same window you watch in. No pop-ups, no redirects.',
    'island.moon.label': 'Moon',
    'island.moon.title': 'Bring her home tonight.',
    'island.moon.windows': 'Download for Windows',
    'island.moon.macos': 'Download for macOS',
    'island.moon.changelog': 'Changelog',
  },
};

/**
 * Theme counts are the single source of truth in `BUILT_IN_THEME_METADATA`.
 * Strings reference them through `{themeCount}` / `{darkCount}` / `{lightCount}`
 * placeholders so adding a built-in theme can never desync the marketing copy
 * (features.07) from the actual app.
 */
const THEME_COUNTS: Record<string, string> = {
  themeCount: String(BUILT_IN_THEME_METADATA.length),
  darkCount: String(BUILT_IN_THEME_METADATA.filter(th => th.isDark).length),
  lightCount: String(BUILT_IN_THEME_METADATA.filter(th => !th.isDark).length),
};

for (const dict of Object.values(translations)) {
  for (const key of Object.keys(dict)) {
    dict[key] = dict[key].replace(
      /\{(themeCount|darkCount|lightCount)\}/g,
      (_, name: string) => THEME_COUNTS[name]
    );
  }
}

/**
 * Keeps an in-site link inside the language's route tree: PL is the default
 * locale and un-prefixed, EN pages live under `/en/...`.
 */
export function localizedPath(lang: SupportedLanguage, href: string): string {
  return lang === 'en' ? `/en${href}` : href;
}

/**
 * Synchronously read the stored language. Falls back to {@link DEFAULT_LANGUAGE}
 * when nothing is persisted yet or the value is unrecognized. Safe to call
 * during SSR — returns the default when `localStorage` is unavailable.
 */
export function getStoredLanguage(): SupportedLanguage {
  if (typeof localStorage === 'undefined') return DEFAULT_LANGUAGE;
  const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(raw) ? raw : DEFAULT_LANGUAGE;
}

/**
 * Resolve a translation key for a given language, falling back to the default
 * language and finally to the key itself when nothing matches.
 */
export function t(key: string, lang: SupportedLanguage): string {
  return translations[lang]?.[key] ?? translations[DEFAULT_LANGUAGE]?.[key] ?? key;
}
