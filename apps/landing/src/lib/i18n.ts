import {
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

    // Navbar
    'nav.primary': 'Nawigacja główna',
    'nav.features': 'Funkcje',
    'nav.preview': 'Podgląd',
    'nav.suite': 'Rodzina',
    'nav.download': 'Pobierz',
    'nav.changelog': 'Zmiany',
    'nav.home': 'Start',
    'nav.cta': 'Pobierz',
    'nav.toggleMenu': 'Menu',
    'nav.github': 'GitHub',
    'nav.switchLanguage': 'Zmień język',
    'nav.switchLanguageToPl': 'Przełącz na polski',
    'nav.switchLanguageToEn': 'Przełącz na angielski',

    // Ticker
    'ticker.onAir': 'NA ŻYWO',

    // Hero
    'hero.eyebrow': 'Pływający dock już dostępny',
    'hero.headline.lead': 'Oglądaj i śledź w',
    'hero.headline.kanji': 'jednym',
    'hero.headline.mark': 'spokojnym miejscu',
    'hero.headline.tail': '.',
    'hero.sub.lead':
      'to aplikacja na komputer: przeglądarka bez reklam, biblioteka, harmonogram emisji i pamiętnik. Cała półka anime w jednym przytulnym oknie.',
    'hero.cta.download': 'Pobierz ShiroAni',
    'hero.cta.os': '· Windows / macOS',
    'hero.cta.see': 'Zobacz jak działa',
    'hero.strip.themes': 'motywów',
    'hero.strip.statuses': 'statusów biblioteki',
    'hero.strip.adfree': 'bez reklam',
    'hero.strip.price': 'wiecznie',
    'hero.strip.priceValue': '0 zł',
    'hero.mock.library': 'Moja biblioteka',
    'hero.mock.titlesSuffix': 'TYTUŁÓW',
    'hero.mock.search': 'Szukaj w bibliotece...',
    'hero.mock.tab.all': 'Wszystkie',
    'hero.mock.tab.watching': 'Oglądam',
    'hero.mock.tab.completed': 'Ukończone',
    'hero.mock.tab.planned': 'Planowane',
    'hero.mock.tab.paused': 'Wstrzymane',
    'hero.mock.tab.dropped': 'Porzucone',
    'hero.dock.library': 'Biblioteka',
    'hero.dock.schedule': 'Harmonogram',
    'hero.dock.diary': 'Pamiętnik',
    'hero.dock.browser': 'Przeglądarka',
    'hero.dock.settings': 'Ustawienia',

    // Chapters
    'chapter.01.eyebrow': 'Chapter one · Co jest w środku',
    'chapter.01.title': 'Jedna aplikacja. ',
    'chapter.01.em': 'Sześć przestrzeni.',
    'chapter.01.meta': '9 funkcji<br />str. 04–09',
    'chapter.02.eyebrow': 'Chapter two · Anatomia aplikacji',
    'chapter.02.title': 'Kliknij pinezkę, żeby ',
    'chapter.02.em': 'zobaczyć szczegóły',
    'chapter.02.titleSuffix': '.',
    'chapter.02.meta': '4 widoki · 12 pinów<br />str. 10–11',
    'chapter.03.eyebrow': 'Chapter three · Mała towarzyszka',
    'chapter.03.title': 'Poznaj ',
    'chapter.03.em': 'Shiro-chan',
    'chapter.03.titleSuffix': '.',
    'chapter.03.meta': '8+ póz<br />str. 13',
    'chapter.04.eyebrow': 'Chapter four · Rodzina',
    'chapter.04.title': 'Jedna cicha półka na ',
    'chapter.04.em': 'anime, mangę i muzykę',
    'chapter.04.titleSuffix': '.',
    'chapter.04.meta': '3 aplikacje<br />1 język wizualny',
    'chapter.05.eyebrow': 'Chapter five · Zainstaluj',
    'chapter.05.title': 'Zabierz ją ',
    'chapter.05.em': 'do siebie',
    'chapter.05.titleSuffix': '.',
    'chapter.05.meta': '2 platformy · 48 MB<br />str. 14',
    'chapter.06.eyebrow': 'Chapter six · Pytania',
    'chapter.06.title': 'Krótko i ',
    'chapter.06.em': 'na temat',
    'chapter.06.titleSuffix': '.',
    'chapter.06.meta': '6 pytań<br />str. 15',

    // Features
    'features.01.no': '№ 01 · BROWSER',
    'features.01.tag': 'AD-BLOCK · GHOSTERY',
    'features.01.title': 'Wbudowana przeglądarka bez reklam.',
    'features.01.desc':
      'Karty, sesje, zakładki i blokada reklam Ghostery — wszystko w tym samym oknie, w którym oglądasz. Żadnych pop-upów ani przekierowań.',
    'features.01.alt': 'Wbudowana przeglądarka',
    'features.02.no': '№ 02 · LIBRARY',
    'features.02.tag': '5 STATUSÓW',
    'features.02.title': 'Biblioteka po Twojemu.',
    'features.02.desc':
      'Oglądane, ukończone, planowane, wstrzymane, porzucone. Filtry, notatki, odcinki.',
    'features.02.alt': 'Biblioteka anime',
    'features.03.no': '№ 03 · SCHEDULE',
    'features.03.tag': 'ANILIST · LIVE',
    'features.03.title': 'Harmonogram emisji z odliczaniem do premiery.',
    'features.03.desc':
      'Widok tygodniowy, dzienny i tabelaryczny. Dane prosto z AniList. Powiadomienie, gdy wchodzi nowy odcinek.',
    'features.03.alt': 'Harmonogram emisji',
    'features.04.no': '№ 04 · DIARY',
    'features.04.tag': 'TIPTAP',
    'features.04.title': 'Pamiętnik z formatowaniem.',
    'features.04.desc':
      'Zapisuj wrażenia po każdym odcinku: tekst z formatowaniem, obrazki, nagłówki — wszystko lokalnie.',
    'features.04.alt': 'Pamiętnik',
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
    'features.07.title': '17 motywów plus edytor własnych.',
    'features.07.desc':
      '15 ciemnych, 2 jasne, większość inspirowana anime. Wizualny edytor palety, czcionek i tła.',
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

    // Suite
    'suite.shiroani.role': 'Tracker anime',
    'suite.shiroani.desc':
      'Biblioteka, harmonogram, pamiętnik i wbudowana przeglądarka bez reklam.',
    'suite.shiroani.here': 'Tutaj jesteś',
    'suite.shiranami.role': 'Przystań dla muzyki',
    'suite.shiranami.desc': 'Odtwarzacz z playlistami, który gra w tle, gdy czytasz lub oglądasz.',
    'suite.kireimanga.role': 'Czytnik mangi',
    'suite.kireimanga.desc': 'Wygodny czytnik z biblioteką rozdziałów, zakładkami i trybem nocnym.',

    // Download CTA
    'download.title.lead': 'Twoja półka anime',
    'download.title.mid': 'w',
    'download.title.em': 'dwóch kliknięciach',
    'download.title.tail': '.',
    'download.body':
      'Za darmo, bez konta i bez reklam. Na Windowsie auto-aktualizacja. Na macOS po każdym pobraniu trzeba wpisać jedną komendę w terminalu, bo aplikacja nie jest podpisana.',
    'download.minor.released': 'wydanie z',
    'download.minor.openSource': 'open source',
    'download.row.win.platform': 'Windows · 64-bit · .exe',
    'download.row.win.file': 'ShiroAni.Setup.exe',
    'download.row.mac.platform': 'macOS · Universal · .dmg',
    'download.row.mac.file': 'ShiroAni.dmg',

    // FAQ
    'faq.heading.lead': 'Najczęstsze ',
    'faq.heading.em': 'pytania',
    'faq.heading.tail': '.',
    'faq.sub': 'Masz inne pytanie? Zajrzyj na Discorda.',
    'faq.q1': 'Czy ShiroAni jest darmowe?',
    'faq.a1':
      'Tak, całkowicie. Żadnego konta, reklam, ani subskrypcji. Kod jest otwarty do wglądu, ale nie wolno go redystrybuować.',
    'faq.q2': 'Na jakich systemach działa?',
    'faq.a2':
      'Windows 10/11 (auto-update) i macOS 11+. Żadna z wersji nie jest podpisana: Windows pokaże ostrzeżenie SmartScreen (kliknij „Więcej informacji" → „Uruchom mimo to"), a na macOS po każdym pobraniu trzeba uruchomić <code>xattr -cr /Applications/ShiroAni.app</code>, bo macOS nakłada kwarantannę na każdy świeżo pobrany plik.',
    'faq.q3': 'Jak działa wbudowana przeglądarka?',
    'faq.a3':
      'Pełna przeglądarka na Chromium z wbudowanym adblockiem Ghostery. Karty, sesje, zakładki, historia — działa jak zwykła przeglądarka, tylko bez reklam i w tym samym oknie co biblioteka.',
    'faq.q4': 'Skąd dane w harmonogramie?',
    'faq.a4':
      'Harmonogram pobiera dane bezpośrednio z publicznego API AniList. Import biblioteki z MyAnimeList i AniList jest w planach.',
    'faq.q5': 'Czy moje dane są bezpieczne?',
    'faq.a5':
      'Wszystkie dane (biblioteka, pamiętnik, ustawienia) są lokalne — SQLite na Twoim dysku. Nie wysyłamy niczego na serwer.',
    'faq.q6': 'Interfejs jest tylko po polsku?',
    'faq.a6': 'Polski i angielski. Przełącznik języka jest w prawym górnym rogu strony.',

    // Footer
    'footer.blurb':
      'Shiro-chan wciąż rośnie. Apka jest na wczesnym etapie, ale z każdym wydaniem robi się przytulniej.',
    'footer.col.product': 'Produkt',
    'footer.col.resources': 'Zasoby',
    'footer.col.suite': 'Rodzina',
    'footer.link.features': 'Funkcje',
    'footer.link.preview': 'Podgląd',
    'footer.link.download': 'Pobierz',
    'footer.link.changelog': 'Lista zmian',
    'footer.link.faq': 'FAQ',
    'footer.link.github': 'GitHub',
    'footer.link.discord': 'Discord',
    'footer.copyright': 'Wszelkie prawa zastrzeżone',
    'footer.tagline': '白 · アニ · Made with ♥ in Poland',

    // Anatomy (React island)
    'anatomy.aria.tablist': 'Anatomia widoków aplikacji',
    'anatomy.tab.library': 'Biblioteka',
    'anatomy.tab.schedule': 'Harmonogram',
    'anatomy.tab.newtab': 'Nowa karta',
    'anatomy.tab.settings': 'Ustawienia',
    'anatomy.viewLabel.library': 'Widok · Biblioteka',
    'anatomy.viewLabel.schedule': 'Widok · Harmonogram',
    'anatomy.viewLabel.newtab': 'Widok · Nowa karta',
    'anatomy.viewLabel.settings': 'Widok · Ustawienia',
    'anatomy.title.library': 'Twoja półka z tytułami. Statusy, postęp, okładki.',
    'anatomy.title.schedule': 'Harmonogram emisji prosto z AniList.',
    'anatomy.title.newtab': 'Nowa karta z powitaniem i ulubionymi stronami pod ręką.',
    'anatomy.title.settings': 'Ustawienia: czytelność, motywy, integracje.',
    'anatomy.pin': 'Pin',
    // library pins
    'anatomy.library.pin1.title': 'Nagłówek',
    'anatomy.library.pin1.text': 'Nazwa widoku i licznik pozycji.',
    'anatomy.library.pin2.title': 'Akcje',
    'anatomy.library.pin2.text':
      'Sortowanie, import, eksport, statystyki oraz przełącznik siatki i listy.',
    'anatomy.library.pin3.title': 'Filtry statusu',
    'anatomy.library.pin3.text':
      'Sześć statusów: Wszystkie, Oglądam, Ukończone, Planowane, Wstrzymane, Porzucone.',
    'anatomy.library.pin4.title': 'Karty serii',
    'anatomy.library.pin4.text':
      'Okładki z biblioteki, postęp (Odc. 8/12), badge statusu. Klik otwiera szczegóły i pamiętnik.',
    // schedule pins
    'anatomy.schedule.pin1.title': 'Zakres tygodnia',
    'anatomy.schedule.pin1.text': 'Zakres dat u góry widoku. Dane lecą na żywo z AniList.',
    'anatomy.schedule.pin2.title': 'Dzień aktywny',
    'anatomy.schedule.pin2.text':
      'Dzisiejszy dzień wyróżniony kolorem. Obok numer dnia i skrót nazwy tygodnia.',
    'anatomy.schedule.pin3.title': 'Karta odcinka',
    'anatomy.schedule.pin3.text':
      'Plakat, numer odcinka i godzina emisji. Podświetlenie dla serii z biblioteki oraz z subskrypcji.',
    // newtab pins
    'anatomy.newtab.pin1.title': 'Powitanie',
    'anatomy.newtab.pin1.text':
      'Powitanie z imieniem i podsumowaniem dnia: odcinki dzisiaj oraz nowości w subskrypcjach.',
    'anatomy.newtab.pin2.title': 'Emitowane dzisiaj',
    'anatomy.newtab.pin2.text':
      'Poziomy pasek z odcinkami, które emitują się dzisiaj, wraz z godziną premiery.',
    'anatomy.newtab.pin3.title': 'Szybki dostęp',
    'anatomy.newtab.pin3.text':
      'Kafelki z ulubionymi stronami. Ikona, nazwa i konfiguracja w jednym kliknięciu.',
    // settings pins
    'anatomy.settings.pin1.title': 'Kategorie',
    'anatomy.settings.pin1.text':
      'Pięć grup ustawień: Aplikacja, Wygląd, Integracje, Dane, Zaawansowane.',
    'anatomy.settings.pin2.title': 'Czytelność',
    'anatomy.settings.pin2.text': 'Skala tekstu i interfejsu. Pięć poziomów od 95% do 115%.',
    'anatomy.settings.pin3.title': 'Motywy kolorystyczne',
    'anatomy.settings.pin3.text':
      '17 wbudowanych palet: 15 ciemnych i 2 jasne. Kliknięcie zastosuje motyw od razu.',
    'anatomy.settings.pin4.title': 'Import własnego motywu',
    'anatomy.settings.pin4.text':
      'Zaimportuj motyw z pliku lub zbuduj własny w edytorze z podglądem na żywo.',

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

    // Navbar
    'nav.primary': 'Primary navigation',
    'nav.features': 'Features',
    'nav.preview': 'Preview',
    'nav.suite': 'Suite',
    'nav.download': 'Download',
    'nav.changelog': 'Changelog',
    'nav.home': 'Home',
    'nav.cta': 'Download',
    'nav.toggleMenu': 'Menu',
    'nav.github': 'GitHub',
    'nav.switchLanguage': 'Switch language',
    'nav.switchLanguageToPl': 'Switch to Polish',
    'nav.switchLanguageToEn': 'Switch to English',

    // Ticker
    'ticker.onAir': 'ON AIR',

    // Hero
    'hero.eyebrow': 'Floating dock now available',
    'hero.headline.lead': 'Watch and track in',
    'hero.headline.kanji': 'one',
    'hero.headline.mark': 'quiet place',
    'hero.headline.tail': '.',
    'hero.sub.lead':
      'is a desktop app: an ad-free browser, a library, an airing schedule and a diary. Your whole anime shelf in one cozy window.',
    'hero.cta.download': 'Download ShiroAni',
    'hero.cta.os': '· Windows / macOS',
    'hero.cta.see': 'See how it works',
    'hero.strip.themes': 'themes',
    'hero.strip.statuses': 'library statuses',
    'hero.strip.adfree': 'ad-free',
    'hero.strip.price': 'forever',
    'hero.strip.priceValue': 'Free',
    'hero.mock.library': 'My library',
    'hero.mock.titlesSuffix': 'TITLES',
    'hero.mock.search': 'Search the library...',
    'hero.mock.tab.all': 'All',
    'hero.mock.tab.watching': 'Watching',
    'hero.mock.tab.completed': 'Completed',
    'hero.mock.tab.planned': 'Planned',
    'hero.mock.tab.paused': 'On hold',
    'hero.mock.tab.dropped': 'Dropped',
    'hero.dock.library': 'Library',
    'hero.dock.schedule': 'Schedule',
    'hero.dock.diary': 'Diary',
    'hero.dock.browser': 'Browser',
    'hero.dock.settings': 'Settings',

    // Chapters
    'chapter.01.eyebrow': 'Chapter one · What’s inside',
    'chapter.01.title': 'One app. ',
    'chapter.01.em': 'Six spaces.',
    'chapter.01.meta': '9 features<br />p. 04–09',
    'chapter.02.eyebrow': 'Chapter two · App anatomy',
    'chapter.02.title': 'Click a pin to ',
    'chapter.02.em': 'see the details',
    'chapter.02.titleSuffix': '.',
    'chapter.02.meta': '4 views · 12 pins<br />p. 10–11',
    'chapter.03.eyebrow': 'Chapter three · A small companion',
    'chapter.03.title': 'Meet ',
    'chapter.03.em': 'Shiro-chan',
    'chapter.03.titleSuffix': '.',
    'chapter.03.meta': '8+ poses<br />p. 13',
    'chapter.04.eyebrow': 'Chapter four · The family',
    'chapter.04.title': 'One quiet shelf for ',
    'chapter.04.em': 'anime, manga and music',
    'chapter.04.titleSuffix': '.',
    'chapter.04.meta': '3 apps<br />1 visual language',
    'chapter.05.eyebrow': 'Chapter five · Install',
    'chapter.05.title': 'Take it ',
    'chapter.05.em': 'home',
    'chapter.05.titleSuffix': '.',
    'chapter.05.meta': '2 platforms · 48 MB<br />p. 14',
    'chapter.06.eyebrow': 'Chapter six · Questions',
    'chapter.06.title': 'Short and ',
    'chapter.06.em': 'to the point',
    'chapter.06.titleSuffix': '.',
    'chapter.06.meta': '6 questions<br />p. 15',

    // Features
    'features.01.no': '№ 01 · BROWSER',
    'features.01.tag': 'AD-BLOCK · GHOSTERY',
    'features.01.title': 'A built-in, ad-free browser.',
    'features.01.desc':
      'Tabs, sessions, bookmarks and Ghostery ad-blocking — all in the same window where you watch. No popups, no redirects.',
    'features.01.alt': 'Built-in browser',
    'features.02.no': '№ 02 · LIBRARY',
    'features.02.tag': '5 STATUSES',
    'features.02.title': 'A library that bends to you.',
    'features.02.desc': 'Watching, completed, planned, on hold, dropped. Filters, notes, episodes.',
    'features.02.alt': 'Anime library',
    'features.03.no': '№ 03 · SCHEDULE',
    'features.03.tag': 'ANILIST · LIVE',
    'features.03.title': 'Airing schedule with countdowns to each premiere.',
    'features.03.desc':
      'Weekly, daily and table views. Data straight from AniList. A nudge when a new episode lands.',
    'features.03.alt': 'Airing schedule',
    'features.04.no': '№ 04 · DIARY',
    'features.04.tag': 'TIPTAP',
    'features.04.title': 'A diary with rich formatting.',
    'features.04.desc':
      'Write down your thoughts after every episode: rich text, images, headings — all stored locally.',
    'features.04.alt': 'Diary',
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
    'features.07.title': '17 themes plus a custom theme editor.',
    'features.07.desc':
      '15 dark, 2 light, mostly anime-inspired. A visual editor for palette, fonts and background.',
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

    // Suite
    'suite.shiroani.role': 'Anime tracker',
    'suite.shiroani.desc': 'Library, schedule, diary, and a built-in ad-free browser.',
    'suite.shiroani.here': 'You are here',
    'suite.shiranami.role': 'A sanctuary for music',
    'suite.shiranami.desc':
      'A playlist player that hums in the background while you read or watch.',
    'suite.kireimanga.role': 'Manga reader',
    'suite.kireimanga.desc':
      'A comfortable reader with a chapter library, bookmarks and a night mode.',

    // Download CTA
    'download.title.lead': 'Your anime shelf',
    'download.title.mid': 'in',
    'download.title.em': 'two clicks',
    'download.title.tail': '.',
    'download.body':
      'Free, no account, no ads. Auto-updates on Windows. On macOS you have to run one Terminal command after each download because the app isn’t signed.',
    'download.minor.released': 'released on',
    'download.minor.openSource': 'open source',
    'download.row.win.platform': 'Windows · 64-bit · .exe',
    'download.row.win.file': 'ShiroAni.Setup.exe',
    'download.row.mac.platform': 'macOS · Universal · .dmg',
    'download.row.mac.file': 'ShiroAni.dmg',

    // FAQ
    'faq.heading.lead': 'Frequently asked ',
    'faq.heading.em': 'questions',
    'faq.heading.tail': '.',
    'faq.sub': 'Got another question? Drop by the Discord.',
    'faq.q1': 'Is ShiroAni free?',
    'faq.a1':
      'Yes, completely. No account, no ads, no subscription. The source is available to read but not to redistribute.',
    'faq.q2': 'Which systems does it run on?',
    'faq.a2':
      'Windows 10/11 (auto-update) and macOS 11+. Neither build is signed: Windows shows a SmartScreen warning (click "More info" → "Run anyway"), and on macOS you have to run <code>xattr -cr /Applications/ShiroAni.app</code> after every download because macOS quarantines anything fresh off the internet.',
    'faq.q3': 'How does the built-in browser work?',
    'faq.a3':
      'A full Chromium browser with Ghostery ad-blocking baked in. Tabs, sessions, bookmarks, history — it works like a normal browser, just without the ads and in the same window as the library.',
    'faq.q4': 'Where does the schedule data come from?',
    'faq.a4':
      'The schedule pulls directly from the public AniList API. Library import from MyAnimeList and AniList is on the roadmap.',
    'faq.q5': 'Is my data safe?',
    'faq.a5':
      'All data (library, diary, settings) is local — SQLite on your disk. Nothing is sent to a server.',
    'faq.q6': 'Is the interface only in Polish?',
    'faq.a6': 'Polish and English. The language switcher is in the top-right of the page.',

    // Footer
    'footer.blurb':
      'Shiro-chan is still growing. The app is early, but every release makes it cozier.',
    'footer.col.product': 'Product',
    'footer.col.resources': 'Resources',
    'footer.col.suite': 'Family',
    'footer.link.features': 'Features',
    'footer.link.preview': 'Preview',
    'footer.link.download': 'Download',
    'footer.link.changelog': 'Changelog',
    'footer.link.faq': 'FAQ',
    'footer.link.github': 'GitHub',
    'footer.link.discord': 'Discord',
    'footer.copyright': 'All rights reserved',
    'footer.tagline': '白 · アニ · Made with ♥ in Poland',

    // Anatomy
    'anatomy.aria.tablist': 'App view anatomy',
    'anatomy.tab.library': 'Library',
    'anatomy.tab.schedule': 'Schedule',
    'anatomy.tab.newtab': 'New tab',
    'anatomy.tab.settings': 'Settings',
    'anatomy.viewLabel.library': 'View · Library',
    'anatomy.viewLabel.schedule': 'View · Schedule',
    'anatomy.viewLabel.newtab': 'View · New tab',
    'anatomy.viewLabel.settings': 'View · Settings',
    'anatomy.title.library': 'Your shelf of titles. Statuses, progress, covers.',
    'anatomy.title.schedule': 'Airing schedule straight from AniList.',
    'anatomy.title.newtab': 'A new tab with a greeting and your favorite sites at hand.',
    'anatomy.title.settings': 'Settings: readability, themes, integrations.',
    'anatomy.pin': 'Pin',
    // library
    'anatomy.library.pin1.title': 'Header',
    'anatomy.library.pin1.text': 'View name and item counter.',
    'anatomy.library.pin2.title': 'Actions',
    'anatomy.library.pin2.text': 'Sort, import, export, statistics and a grid/list switcher.',
    'anatomy.library.pin3.title': 'Status filters',
    'anatomy.library.pin3.text':
      'Six statuses: All, Watching, Completed, Planned, On hold, Dropped.',
    'anatomy.library.pin4.title': 'Series cards',
    'anatomy.library.pin4.text':
      'Library covers, progress (Ep. 8/12), status badge. Click opens details and the diary.',
    // schedule
    'anatomy.schedule.pin1.title': 'Week range',
    'anatomy.schedule.pin1.text':
      'Date range at the top of the view. Data flows live from AniList.',
    'anatomy.schedule.pin2.title': 'Active day',
    'anatomy.schedule.pin2.text':
      'Today highlighted in color. Day number and weekday short name next to it.',
    'anatomy.schedule.pin3.title': 'Episode card',
    'anatomy.schedule.pin3.text':
      'Poster, episode number and airing time. Highlighted for series in your library and subscriptions.',
    // newtab
    'anatomy.newtab.pin1.title': 'Greeting',
    'anatomy.newtab.pin1.text':
      'A greeting with your name and a recap of the day: episodes today and new entries in your subscriptions.',
    'anatomy.newtab.pin2.title': 'Airing today',
    'anatomy.newtab.pin2.text':
      'A horizontal strip of episodes airing today, with their premiere times.',
    'anatomy.newtab.pin3.title': 'Quick access',
    'anatomy.newtab.pin3.text':
      'Tiles of favorite sites. Icon, name and configuration in one click.',
    // settings
    'anatomy.settings.pin1.title': 'Categories',
    'anatomy.settings.pin1.text':
      'Five groups of settings: App, Appearance, Integrations, Data, Advanced.',
    'anatomy.settings.pin2.title': 'Readability',
    'anatomy.settings.pin2.text': 'Text and interface scale. Five levels from 95% to 115%.',
    'anatomy.settings.pin3.title': 'Color themes',
    'anatomy.settings.pin3.text':
      '17 built-in palettes: 15 dark and 2 light. A click applies the theme instantly.',
    'anatomy.settings.pin4.title': 'Import a custom theme',
    'anatomy.settings.pin4.text':
      'Import a theme from a file or build your own in the editor with a live preview.',

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
  },
};

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
