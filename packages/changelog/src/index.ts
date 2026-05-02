/**
 * Shared changelog data — single source of truth consumed by:
 *   - `apps/web` (in-app `ChangelogView`, via `apps/web/src/lib/changelog-entries.ts`)
 *   - `apps/landing` (marketing changelog page, via `apps/landing/src/lib/releases.ts`)
 *
 * Pure data only. No React / lucide / CSS — consumers map `category.kind` to
 * their own presentation layer (PillTag variants in web, lucide icons in
 * landing). When shipping a new release, edit this file and re-run
 * `pnpm --filter @shiroani/changelog build` so the symlinked `dist/` updates.
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

export interface Category {
  kind: CategoryKind;
  /** Uppercase label shown next to the entry list. */
  label: string;
  /** Bullet list of user-facing changes. Plain strings only — keep copy non-technical. */
  entries: string[];
}

export type ReleaseType = 'major' | 'minor';

export interface Release {
  /** Dotted version without the leading `v` (e.g. `0.5.0`). */
  version: string;
  /** Localized human-readable date (Polish long form). */
  date: string;
  /** Short machine date used in the left rail (e.g. `13.04.2026`). */
  shortDate: string;
  /** One-liner headline. */
  title: string;
  /** One-paragraph summary visible above the category lists. */
  description: string;
  /** Used by the top filter chips to split major/minor releases. */
  type: ReleaseType;
  /** True for the topmost release — gets a solid dot and a "Najnowsza" badge. */
  latest?: boolean;
  categories: Category[];
}

export const RELEASES: readonly Release[] = [
  {
    version: '0.9.0',
    date: '2 maja 2026',
    shortDate: '02.05.2026',
    title: 'Własna maskotka i przełącznik animacji bujania',
    description:
      'Maskotka na pulpicie może teraz nosić własny obrazek — wystarczy wskazać PNG, JPG, GIF albo WEBP w Ustawieniach → Maskotka i Shiro-chan zamieni się w cokolwiek innego. Do tego nowy przełącznik wyłącza delikatne bujanie maskotki, gdy przeszkadza, a podgląd pozycji docka w ustawieniach pokazuje teraz prawdziwe ikony i maskotkę zamiast samych kropek.',
    type: 'minor',
    latest: true,
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
  {
    version: '0.8.0',
    date: '28 kwietnia 2026',
    shortDate: '28.04.2026',
    title: 'Podzielone karty w przeglądarce i czytelniejsze błędy AniList',
    description:
      'Wbudowana przeglądarka uczy się nowej sztuczki: można teraz otworzyć dwie strony obok siebie w jednej karcie — wystarczy przeciągnąć kartę na bok, żeby utworzyć drugi panel. Idealne do oglądania odcinka i jednoczesnego sprawdzania AniList. Do tego ekrany Profilu, Harmonogramu i Odkrywaj nie pokazują już pustej strony, gdy AniList ma awarię — zamiast tego widać czytelny komunikat z powodem problemu.',
    type: 'minor',
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
  {
    version: '0.7.0',
    date: '27 kwietnia 2026',
    shortDate: '27.04.2026',
    title: 'Statystyki w aplikacji, blokowanie reklam na żywo i odświeżony system aktualizacji',
    description:
      'Sporo nowości: profil dostał zakładkę „W aplikacji" z licznikami czasu i 12-tygodniową siatką aktywności, blokada reklam pobiera teraz listy filtrów uBlock Origin na żywo (mocno pomaga na YouTubie), a sekcje aktualizacji i błędów dostały nowy wygląd. Do tego solidne hartowanie bezpieczeństwa, aktualizacja silnika do Electron 41.3.0 i wiele bumpów zależności.',
    type: 'major',
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
  {
    version: '0.6.2',
    date: '22 kwietnia 2026',
    shortDate: '22.04.2026',
    title: 'Naprawa logowania do AniList i nowa sekcja Rodzina',
    description:
      'Szybka poprawka przywracająca logowanie do AniList we wbudowanej przeglądarce. Przy okazji w ustawieniach pojawiła się nowa sekcja Rodzina, w której można poznać siostrzane aplikacje — Shiranami i KireiManga.',
    type: 'minor',
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
  {
    version: '0.6.1',
    date: '21 kwietnia 2026',
    shortDate: '21.04.2026',
    title: 'Szybka poprawka zakładek i przeczytanych wiadomości',
    description:
      'Drobna aktualizacja naprawiająca zapisywanie zakładek i stanu przeczytania w widoku Aktualności. Po redesignie dwa nowe klucze zapisu nie zostały dodane do listy dozwolonej, przez co zakładki i oznaczenia przeczytanych artykułów nie przetrwały restartu aplikacji.',
    type: 'minor',
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
  {
    version: '0.6.0',
    date: '21 kwietnia 2026',
    shortDate: '21.04.2026',
    title: 'Wielki redesign, nowy wygląd aplikacji i nowa strona',
    description:
      'Największa aktualizacja wizualna od premiery. ShiroAni dostała kompletnie przeprojektowany interfejs z nowymi motywami, odświeżonymi widokami i rozbudowanymi ustawieniami. Strona internetowa również została zbudowana od zera. Jeśli coś wygląda znajomo, ale inaczej, tak, to właśnie to.',
    type: 'major',
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
  {
    version: '0.5.0',
    date: '13 kwietnia 2026',
    shortDate: '13.04.2026',
    title: 'Odkrywaj anime, pokaż swój profil i wracaj szybciej do oglądania',
    description:
      'Ta aktualizacja skupia się głównie na wygodzie. Pojawił się nowy widok Odkrywaj, profil AniList z kartą do udostępniania, lepsze powiadomienia na Windowsie i kilka zmian, które po prostu ułatwiają codzienne korzystanie z aplikacji.',
    type: 'major',
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
  {
    version: '0.4.2',
    date: '10 kwietnia 2026',
    shortDate: '10.04.2026',
    title: 'Poprawki stabilności i wygody',
    description:
      'Kilka drobnych poprawek zauważonych podczas korzystania z aplikacji. Aplikacja na Windowsie zamyka się teraz poprawnie, linki otwierają się wewnątrz aplikacji, a onboarding nie pojawia się ponownie bez potrzeby.',
    type: 'minor',
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
  {
    version: '0.4.1',
    date: '9 kwietnia 2026',
    shortDate: '09.04.2026',
    title: 'Aktualizacja bezpieczeństwa',
    description:
      'Mała, ale ważna aktualizacja. Odświeżyliśmy kilka bibliotek, na których opiera się aplikacja, żeby zamknąć zgłoszone luki bezpieczeństwa. Nie ma tu nowych funkcji, ale warto zainstalować ją jak najszybciej. Aktualizacja pobierze się automatycznie.',
    type: 'minor',
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
  {
    version: '0.4.0',
    date: '8 kwietnia 2026',
    shortDate: '08.04.2026',
    title: 'Blokowanie reklam popupowych i skróty klawiszowe',
    description:
      'Wbudowana przeglądarka stała się znacznie przyjemniejsza w użyciu. Doszło inteligentne blokowanie popupów reklamowych z iframe video playerów, pełna obsługa skrótów klawiszowych i naprawiona ikona w zasobniku systemowym.',
    type: 'major',
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
  {
    version: '0.3.2',
    date: '6 kwietnia 2026',
    shortDate: '06.04.2026',
    title: 'Google login i poprawki maskotki',
    description:
      'Naprawiono blokadę logowania do kont Google w wbudowanej przeglądarce oraz błędy ładowania nakładki maskotki w trybie deweloperskim.',
    type: 'minor',
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
  {
    version: '0.3.1',
    date: '6 kwietnia 2026',
    shortDate: '06.04.2026',
    title: 'Discord RPC: ciągły timer sesji',
    description:
      'Czas wyświetlany w Discord Rich Presence teraz pokazuje całkowity czas od uruchomienia aplikacji, zamiast resetować się przy zmianie widoku lub przejściu w tryb bezczynności.',
    type: 'minor',
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
  {
    version: '0.3.0',
    date: '27 marca 2026',
    shortDate: '27.03.2026',
    title: 'Czytelność i szczegóły anime',
    description:
      'Nowe narzędzia do personalizacji interfejsu i szybszego dostępu do informacji o anime: skalowanie czcionek, dialog szczegółów anime w harmonogramie i przywrócone linki do repozytorium.',
    type: 'major',
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
  {
    version: '0.2.1',
    date: '19 marca 2026',
    shortDate: '19.03.2026',
    title: 'Stabilizacja i poprawki',
    description:
      'Wydanie poprawkowe skupione na dopracowaniu nowego widoku Aktualności i usunięciu najbardziej uciążliwych problemów na macOS, od stanów ładowania RSS po zachowanie maskotki, Docka i okna aplikacji.',
    type: 'minor',
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
  {
    version: '0.2.0',
    date: '19 marca 2026',
    shortDate: '19.03.2026',
    title: 'Anime News Feed',
    description:
      'ShiroAni agreguje teraz wiadomości ze świata anime z 11 źródeł RSS, po angielsku i po polsku. Nowy widok „Aktualności" pozwala być na bieżąco z newsami, premierami odcinków i recenzjami.',
    type: 'major',
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
  {
    version: '0.1.0',
    date: '17 marca 2026',
    shortDate: '17.03.2026',
    title: 'Pierwsze wydanie',
    description:
      'Wszystko zaczęło się od prostego pytania: a co, gdyby śledzenie anime było wygodne? Tak powstał pierwszy publiczny build ShiroAni.',
    type: 'major',
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
];
