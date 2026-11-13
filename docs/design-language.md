# RaceGrid — Design Language

> **Superseded.** The current, locked system is `DESIGN_SYSTEM.md` (values) and `UI_RULES.md` (rules) at the
> repository root, based on the Limns Admin / Geist screenshots in `references/ui/`. This file is kept as history of
> v1–v5 only; do not follow it for new work.

> **v4 (current): the screen of the red reference, not the photograph.** `references/reference-ui-design.png`
> sets proportions, typography, density and surfaces. The red light, reflections and vignette around the laptop
> are photography and are not reproduced; only a barely visible warm glow remains at the far right edge.
>
> **Layers** (opaque, no blur): page `#080809` · sidebar `#0A0A0B` · panel `#0E0E10` · group inside a panel `#121214`
> · controls/popovers `#1A1A1D` · selected navigation `#1F1F23`. Edges are white at 5.5–7.5 %, panels carry a 3.5 %
> top highlight. Radii: controls 6, groups 8, panels 10. Sections are 12 px apart.
>
> **Composition:** sidebar · top bar · page context (`PageHeader`, optional second row for headline stats) ·
> workspace (`Panel`: tabs/filters in the toolbar + data) · supporting detail panel (`DetailPanel`: small uppercase
> section labels, label/value pairs, hairline dividers). A `Card` adapts to where it sits: panel on the page, group
> in a workspace, section in a detail panel; loading/error/empty states become a panel only when nothing around is one.
>
> **Type:** Inter only (Orbitron is limited to calendar tile titles). Data 13 px regular, metadata 11–12 px, page
> titles 21 px semibold, controls medium. Tabular figures in tables. One emphasised value per row.
>
> **Red:** 2 px marker of the active sidebar item, 2 px underline of the active tab, the screen's main action,
> darkened red background (+ 2 px edge) of a genuinely selected row. No glows. Hover = faint surface lift, clearly
> weaker than selection. Team and data colours stay in markers, chart lines and legends.
>
> **Controls:** 32 px high (search, selects, buttons, segmented), one neutral focus ring. Tables: 36 px rows,
> hairline separators, 11 px uppercase headers; they never scroll sideways, secondary columns hide via container
> queries (`optional` < 760 px, `optionalNarrow` < 520 px).
>
> **Motion:** route and panel fade 240 ms, tile stagger on Calendar/Tracks only, chart/outline draw-in 500 ms, tab
> indicator slide, select/tooltip pop from their origin, FLIP re-ordering in the timing tower. Data updates and
> table rows are not animated; `prefers-reduced-motion` keeps short fades only.

---

## Earlier iterations

> **v3 (current): red / black.** Colours and colour-bearing patterns come back from the red reference
> (`references/reference-ui-design.png`): near-black surfaces, red `#E10A23` accent, dark nav pill with a red
> left bar, red underline tabs, red-gradient selected row and primary button. Everything else below from v2
> (radii, status pills, motion) stays. Fastest sector uses `--fastest` purple (F1 convention).
>
> v3.1: page background is `references/ui/background-red-black.webp` (served as `/background.webp`). Base `#070708`;
> panels `rgba(17,17,19,.78)→rgba(9,9,10,.78)` + `blur(20px)`, border `rgba(255,255,255,.055)`, radius 12;
> inputs `rgba(20,20,22,.75)` + `blur(16px)`; sidebar `rgba(7,7,8,.88)`, active item `rgba(255,255,255,.07)` + 2px red bar;
> inner tabs have no background: inactive `rgba(255,255,255,.38)`, hover `.65`, active `#F5F5F5` + 2px `#E10600` underline.
>
> **v2 (superseded colours): violet.** Source of truth: `references/ui/violet-backlog.png`, `violet-board.png`,
> `violet-roadmap.png`. Tokens live in `frontend/src/styles/tokens.css`, motion in `frontend/src/styles/motion.css`.
> The v1 red reference (`references/reference-ui-design.png`) below still defines layout, density and
> component anatomy; v2 replaces colour, radii and motion.
>
> | v2 change                        | Value                                                                                              |
> | -------------------------------- | -------------------------------------------------------------------------------------------------- |
> | Page                             | navy → violet gradient with soft violet light (fixed `body::before`)                               |
> | Surfaces                         | translucent `rgba(30,32,70,.62)`, hairline `rgba(255,255,255,.07)`, top highlight                  |
> | Accent                           | violet `#7C62EE` (hover `#8B74F2`, text `#B3A3FF`)                                                 |
> | Active nav / tabs / selected row | **solid violet pill**, white text, soft violet glow                                                |
> | Secondary button                 | violet outline; primary = solid violet                                                             |
> | Status pills                     | tinted fill + matching border (info blue, success green, warning amber, danger red, accent violet) |
> | Radii                            | controls 8, cards 14, badges 6                                                                     |
> | Fastest sector                   | violet (F1 convention: purple = fastest)                                                           |
>
> **Motion rules (Emil Kowalski):** ease-out `cubic-bezier(.23,1,.32,1)` for enter, ease-in-out
> `cubic-bezier(.77,0,.175,1)` for on-screen movement; UI ≤ 320 ms; press = `scale(.97)`; hover effects only
> under `(hover: hover) and (pointer: fine)`; animations use `backwards` fill so they never lock transforms.
> Used: route fade, card enter, 40 ms stagger (capped), sliding pill for tabs/segments, chart and outline
> draw-in, dropdown/tooltip pop from their origin, FLIP re-ordering in the timing tower, bar grow.
> Not animated: keyboard shortcuts, replay car positions (data-driven), anything under reduced motion
> except short fades.

---

## v1 reference analysis (layout and anatomy)

Wyprowadzone z `references/reference-ui-design.png` (source of truth).

> **Zastrzeżenie pomiarowe.** Referencja to zdjęcie laptopa w perspektywie, z czerwonymi refleksami tła.
> Wartości px i HEX poniżej są **szacunkami** (przeliczone na viewport ~1440 px, kolory próbkowane z płaskich
> obszarów). Miejsca oznaczone **[?]** nie dają się pewnie odczytać. Tło za laptopem, klawiatura, pasek macOS
> i czerwone smugi światła **nie są** częścią UI.

---

## 1. Visual principles

1. **Prawie-czarny, neutralny, płaski.** Powierzchnie to odcienie #060606–#111111 bez niebieskiego/ciepłego zabarwienia. Hierarchię buduje minimalna różnica jasności + hairline border, nie cienie.
2. **Jeden akcent: czerwień.** Czerwony pojawia się rzadko i zawsze znaczy „aktywne / wybrane / główna akcja”. Nigdy jako dekoracja.
3. **Wysoka gęstość, spokojny rytm.** Dużo danych na ekranie, małe wiersze, brak separatorów między wierszami, brak zebry. Porządek daje wyrównanie kolumn, nie ramki.
4. **Tekst robi robotę.** Tabs, filtry, akcje drugorzędne to czysty tekst + ikona, bez tła. Przyciski z tłem tylko dla akcji głównych.
5. **Mikro-etykiety uppercase.** Każda para label/value i każdy nagłówek sekcji/kolumny używa małego, rozstrzelonego uppercase nad lub obok wartości.
6. **Kolor danych tylko w małych markerach.** Kolorowe elementy (kwadraty typu zadania, awatary) są małe (~16 px). W RaceGrid → kolory zespołów F1 jako paski/kwadraty, nigdy jako tła dużych powierzchni.
7. **Niski-średni kontrast drugorzędnego tekstu**, wysoki kontrast tylko dla tytułów i wartości wybranych.

## 2. Layout system

Struktura (desktop, trzy kolumny + topbar):

```
┌──────────┬───────────────────────────────────────────────┬──────────────┐
│          │ Topbar: global search ............ icons  avatar             │
│ Sidebar  ├───────────────────────────────────────────────┬──────────────┤
│  ~240px  │ Page header card (breadcrumb, title, meta)    │ [primary CTA]│
│          │ Tabs                                          ├──────────────┤
│          │ Toolbar: search · filters · secondary CTA     │ Detail panel │
│          │ Content (grouped table / cards)               │  ~320–340px  │
│          │                                               │  (opcjonalny)│
│ Log out  │                                               │              │
└──────────┴───────────────────────────────────────────────┴──────────────┘
```

- **Proporcje (zmierzone):** sidebar ≈ 16–17% szerokości, content ≈ 56%, detail panel ≈ 23%. Przy 1440 px: sidebar ~240 px, panel ~330 px, content fluid.
- **Sidebar:** pełna wysokość, tło najciemniejsze, bez prawego borderu **[?]** (granica wynika z różnicy tła/kart obok). Logo u góry, nawigacja główna, sekcja z mikro-etykietą („TEAMS”) z rozwijanymi grupami (chevron po prawej), akcja „Log out” przyklejona do dołu.
- **Topbar:** ~56 px, search po lewej (szeroki, bez wyraźnego tła), ikony akcji (bell, settings) i awatar po prawej. Brak dolnego borderu **[?]**.
- **Page header:** osobna karta z zaokrągleniem; w jednym rzędzie: blok tytułu (breadcrumb micro + tytuł), kolumny meta (micro-label nad wartością), ikonowy przycisk po prawej. Kolumny meta oddzielone tylko odstępem ~32–48 px.
- **Detail panel:** kontekstowy panel po prawej (szczegóły wybranego wiersza), własna karta, z zamknięciem X. Nad nim, wyrównany do jego szerokości, primary CTA.
- **Gutter** między kolumnami/kartami: ~12–16 px. Karty „wiszą” na tle z odstępem, nie stykają się.
- **Grid treści:** brak widocznej siatki 12-kolumnowej; tabela ma stałe kolumny wyrównane do prawej części contentu (Team / Key / Category / Priority ≈ po 90–110 px), nazwa rozciąga się.
- Brak dużych pustych przestrzeni — pusta przestrzeń występuje tylko jako równy padding kart.

## 3. Color tokens

Surfaces (próbkowane, neutralne):

| Token                 | Wartość                          | Użycie                              |
| --------------------- | -------------------------------- | ----------------------------------- |
| `--bg-app`            | `#050505`                        | tło aplikacji, sidebar              |
| `--bg-surface`        | `#0A0A0B`                        | karty: header, tabela, detail panel |
| `--bg-surface-raised` | `#111112` **[?]**                | inputy, grupy wewnątrz kart, hover  |
| `--bg-selected`       | `#1D1D1E`                        | aktywny item nawigacji              |
| `--border-subtle`     | `rgba(255,255,255,0.06)`         | krawędzie kart, dividery sekcji     |
| `--border-default`    | `rgba(255,255,255,0.10)` **[?]** | inputy, ikonowe przyciski           |

Text:

| Token              | Wartość   | Użycie                                                  |
| ------------------ | --------- | ------------------------------------------------------- |
| `--text-primary`   | `#F5F5F5` | tytuły, wartości, aktywne taby/nav                      |
| `--text-secondary` | `#A0A0A0` | treść wierszy, nieaktywny nav                           |
| `--text-tertiary`  | `#7A7A7A` | micro-labels kluczy, placeholdery, liczniki „(8 tasks)” |

Accent (czerwień — rdzeń marki):

| Token             | Wartość                                      | Użycie                                                              |
| ----------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `--accent`        | `#E10A23` (pik próbki `#FF132F`, z poświatą) | underline taba, wskaźnik nav, border secondary CTA                  |
| `--accent-strong` | `#B0141F` **[?]**                            | wypełnienie primary CTA, highlight wybranego wiersza (prawy koniec) |
| `--accent-muted`  | `#320B0D`                                    | tło primary CTA/badge, lewy koniec gradientu wiersza                |
| `--accent-border` | `#4A0A0E`                                    | obrys secondary CTA (outline)                                       |

Status / data:

| Token                        | Wartość                              | Użycie              |
| ---------------------------- | ------------------------------------ | ------------------- |
| `--status-info-bg` / `-fg`   | ciemny granat `~#16202B` / `#AFC4D5` | badge „IN PROGRESS” |
| `--status-accent-bg` / `-fg` | `#300B08` / `#E0A8A0` **[?]**        | badge „ACTIVE”      |
| team colors                  | z danych                             | tylko małe markery  |

Uwagi: nie widać zieleni/żółci statusów (sukces/ostrzeżenie) — **do zdefiniowania** w tym samym stylu (ciemne tło o niskiej saturacji + jasny tekst).

## 4. Typography

- **Krój:** neo-grotesk w stylu Inter / SF Pro **[?]** (dokładny font nieczytelny). Rekomendacja: **Inter** z `font-variant-numeric: tabular-nums` dla czasów, pozycji i punktów.
- **Logo:** wordmark uppercase, szeroki tracking (~0.15em), cienki/regular.
- Skala (szacunek @1440):

| Rola             | Rozmiar / waga                           | Przykład z referencji             |
| ---------------- | ---------------------------------------- | --------------------------------- |
| Page title       | 22–24 / 600                              | „Syncro”                          |
| Meta value       | 18–20 / 500                              | „Mar 21, 2024”                    |
| Panel title      | 15–16 / 600                              | „Multi-select in contact list”    |
| Body / nav / tab | 14 / 400–500                             | nav items, taby                   |
| Table cell       | 13–14 / 400                              | wiersze                           |
| Micro label      | 10–11 / 600, uppercase, tracking ~0.08em | „TODAY'S DATE”, „TEAM”, „DETAILS” |
| Badge            | 10 / 600, uppercase                      | „ACTIVE”, „IN PROGRESS”           |

- Hierarchia przez **wagę i kolor**, nie przez duże rozmiary. Największy tekst na ekranie ma ~24 px.
- Aktywny stan (tab, nav) = kolor primary + waga 500–600; nieaktywny = secondary, 400.

## 5. Spacing / radius / borders

- **Bazowa jednostka 4 px.** Używane kroki: 4, 8, 12, 16, 20, 24, 32.
- Padding kart: 16–20 px. Padding detail panelu: ~16 px, sekcje co ~16 px z dividerem.
- Wiersz tabeli: **~32 px** wysokości, poziomy padding komórek ~8–12 px. Nawigacja sidebar: ~36 px na item, odstęp ikona–tekst 10–12 px.
- Nagłówek grupy w tabeli: ~36 px, z odstępem ~12 px nad kolejną grupą.
- **Radius:** karty 10–12 px, inputy i przyciski 8 px, aktywny item nav ~8 px, badge 4–6 px (nie pełna pigułka), awatary okrągłe. Brak dużych radiusów.
- **Bordery:** 1 px hairline o niskiej alfie. Dividery sekcji w panelu: 1 px `--border-subtle`, pełna szerokość wnętrza. Brak separatorów między wierszami tabeli.
- **Cienie:** praktycznie brak; ewentualnie bardzo miękki cień pod kartą **[?]**. Brak glow poza delikatną poświatą czerwonych elementów (patrz niżej).

## 6. Reusable component patterns

**Sidebar nav item** — ikona outline 18 px + label 14 px. Aktywny: tło `--bg-selected`, radius 8, **pionowy czerwony pasek 2–3 px na lewej krawędzi**, tekst primary 500. Sekcje oddzielone micro-label (np. „TEAMS” → w RaceGrid „ANALYSIS”). Grupy rozwijane: chevron 14 px wyrównany do prawej.

**Page header card** — breadcrumb (`‹ BACK TO …`, micro, tertiary) nad tytułem; kolumny meta: micro-label + wartość; po prawej ikonowy przycisk (~32 px, border default, radius 8).

**Tabs** — tekst bez tła, 14 px; aktywny: primary + czerwony underline ~2 px na szerokość tekstu (lekko wysunięty), nieaktywne: secondary. Odstęp między tabami ~28–32 px.

**Toolbar** — lewa: search input; prawa: tekstowe filtry z ikoną (secondary, bez tła), na końcu secondary CTA.

**Buttons**

- _Primary_ („Add people”): tło gradientowe ciemna→głębsza czerwień (`--accent-muted` → `--accent-strong`), tekst biały 500, ikona 16 px, radius 8, h ~40 px, delikatna czerwona poświata **[?]**. Maks. jeden na ekran.
- _Secondary_ („Create Task”): tło przezroczyste/ciemne, border 1 px czerwony (`--accent-border`/`--accent`), tekst primary, ikona w czerwieni.
- _Ghost/text_ („My tasks”, „All filters”): ikona + tekst secondary, bez tła i borderu.
- _Icon button_: kwadrat ~32 px, border default, radius 8, ikona tertiary/secondary.

**Inputs** — tło `--bg-surface-raised` lub przezroczyste, border hairline, radius 8, h ~36–40 px, ikona lupy 16 px po lewej, placeholder tertiary. Textarea (comment) — ten sam styl.

**Grouped data table** — karta; nagłówek grupy: chevron collapse + kolorowy kwadrat 16 px + nazwa 14/500 + licznik tertiary + badge. Nagłówki kolumn micro-uppercase (tertiary/secondary), zakres dat + avatar-stack nad kolumnami po prawej. Wiersze: ikona typu 16 px (kolorowy kwadrat) + tekst secondary. **Wybrany wiersz:** poziomy gradient od `--accent-muted` (lewo) do `--accent-strong` (prawo), tekst primary, subtelne czerwone podświetlenie komórki wartości kluczowej („High” — wyraźniejszy czerwony blok z radiusem) **[?]** — to jedyny „głośny” element ekranu.

**Detail panel** — tytuł 15–16/600 + X; sekcje (DETAILS, DATES, DESCRIPTION, COMMENTS) z micro-label; siatka key/value 2 kolumny (~40% / 60%), klucz tertiary z dwukropkiem, wartość primary; osoby = awatar 20 px + imię; status = badge. Dividery między sekcjami. Empty state jako zwykły tekst tertiary („There are no comments yet.”).

**Badge** — uppercase 10/600, padding 2×6, radius 4–6, tło tonalne ciemne + jasny tekst tego samego odcienia; opcjonalna mała ikona/kropka.

**Avatar stack** — awatary 20–24 px, overlap ~6 px, ring w kolorze tła, licznik „+7” w małym okrągłym chipie `--bg-surface-raised`.

**Icons** — outline, stroke ~1.5 px, 16–18 px, kolor secondary; w stylu Lucide. Bez kafelków/boxów wokół ikon.

**Stany hover/focus (wnioskowane — nie widoczne na referencji):**

- nav / wiersz hover: tło `--bg-surface-raised`, bez zmiany koloru akcentu;
- tab hover: tekst → primary;
- primary CTA hover: jaśniejsza czerwień, secondary hover: tło `--accent-muted`;
- focus-visible: 1–2 px ring `--accent` z offsetem;
- transitions krótkie (~120–150 ms), tylko kolor/tło.

## 7. Zasady dla kolejnych ekranów

1. **Czerwień maksymalnie w 3–4 miejscach na ekranie:** aktywny nav, aktywny tab, wybrany element, jedna główna akcja. Jeśli coś jeszcze „chce być czerwone” — użyj primary text lub badge.
2. **Szkielet stały:** sidebar + topbar + page header card + tabs. Każdy ekran (Dashboard, Calendar, Round Details, Standings, Tracks, Track Details, Race Replay, Compare, Performance, Trends) wchodzi w ten sam szkielet; różni się tylko obszar contentu i obecność detail panelu.
3. **Detail panel zamiast modali** dla szczegółów elementu listy (np. kierowca w Standings, runda w Calendar, sektor w Track Details).
4. **Tabele przed kartami.** Dane listowe (standings, wyniki, lap times) = gęsta tabela 32 px bez separatorów wierszy. Karty tylko do grupowania sekcji, nie jako „kafelki KPI” z dużymi liczbami — chyba że Dashboard tego wymaga, wtedy w skali typografii z pkt 4 (max ~24 px).
5. **Liczby tabular-nums**, czasy i klucze wyrównane; wartości liczbowe wyrównane do prawej lub w stałych kolumnach.
6. **Kolory zespołów tylko jako markery** (kwadrat/pasek 3–16 px, linie na wykresach). Nigdy tło wiersza czy karty.
7. **Wykresy/mapy torów** (Replay, Compare, Trends, Track Details) na `--bg-surface`, linie siatki `--border-subtle`, osie micro-label tertiary; akcent czerwony tylko dla wybranej serii/kierowcy.
8. **Micro-label uppercase** nad każdą wartością meta i jako nagłówek każdej sekcji.
9. **Bez:** gradientów tła, glassmorphismu, dużych radiusów, dużych nagłówków, ikon w kolorowych boxach, pigułkowych przycisków, cieni jako głównego środka hierarchii. Jedyny dopuszczalny gradient: czerwony highlight wybranego wiersza i primary CTA.
10. **Tokeny, nie literały** — wszystkie kolory/spacing/radius z tokenów powyżej; nowe tokeny tylko gdy referencja nie pokrywa przypadku (np. statusy success/warning).
11. **Weryfikacja wizualna** każdego ekranu vs referencja: najpierw kompozycja i proporcje kolumn, potem gęstość, potem kolor.

### Otwarte kwestie **[?]**

- Dokładny font (Inter vs SF Pro vs inny grotesk).
- Czy sidebar/topbar mają własne bordery, czy tylko różnicę tła.
- Dokładne kolory hairline borderów i `--bg-surface-raised` (zbyt mały kontrast w zdjęciu).
- Czy primary CTA i wybrany wiersz mają realną poświatę (glow), czy to efekt fotografii.
- Stany hover/disabled/focus — wszystkie wywnioskowane.
- Kolory statusów poza czerwonym i niebieskim.
