# RaceGrid

Aplikacja webowa do przeglądania i analizy Formuły 1: kalendarz, wyniki sesji, klasyfikacje, profile kierowców i zespołów oraz informacje o torach. Oferuje także porównania kierowców i telemetrii, analizę tempa i strategii, trendy oraz odtwarzanie wyścigów na mapie toru.

## Jak działa

Frontend jest napisany w **React + TypeScript + Vite**, z React Router i TanStack Query. Pobiera dane bezpośrednio z **OpenF1 API** (`https://api.openf1.org/v1`) — projekt nie ma własnego backendu ani bazy danych. Klient API kolejkuje żądania, obsługuje ponowienia i zapisuje odpowiedzi w pamięci podręcznej przeglądarki.

Analizy są obliczane lokalnie na podstawie danych API. Biblioteka `RaceGrid_Tracks` dostarcza geometrię torów, sektory i okrążenia referencyjne; skrypty przygotowują z niej pliki dla interfejsu. Replay łączy dane pozycji, telemetrii, pit stopów, pogody i komunikatów wyścigowych.

Dane obejmują sezony od 2023 roku, zależnie od dostępności w OpenF1. Dane historyczne są pobierane bez klucza API; dostęp do danych podczas trwających sesji może być ograniczony. Mapy i wskaźniki analityczne są przybliżeniami, a nie oficjalnymi pomiarami F1.

## Uruchomienie

Wymagany Node.js **24** (wersja wskazana w `.node-version`) i npm.

```bash
cd frontend
npm ci
npm run dev -- --port 5174
```

Aplikacja: `http://localhost:5174`. Start i build przygotowują tory lokalnie, bez połączeń do API. Portrety kierowców są zapisane w repozytorium; `npm run headshots` pobiera nowe zdjęcia (wymaga internetu), które należy przejrzeć i dodać do Git. Opcjonalny Real-ESRGAN poprawia zdjęcia, jeśli jest dostępny; nie jest wymagany. Działająca aplikacja wymaga połączenia z OpenF1.

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Cloudflare Pages

Połącz repozytorium z Pages i ustaw gałąź produkcyjną `main`. Katalog główny buildu pozostaw na poziomie repozytorium — generowanie torów wymaga dostępu do `RaceGrid_Tracks` obok `frontend`.

- Build command: `npm --prefix frontend ci && npm --prefix frontend run build`.
- Output directory: `frontend/dist` (również w `wrangler.toml`).
- Node: `24`, zgodnie z `.node-version`; można też ustawić `NODE_VERSION=24` w Pages.
- Nie są potrzebne sekrety ani własny backend. Tokenów OpenF1 nie należy dodawać do frontendu.

Pages obsługuje trasy SPA automatycznie, o ile nie dodamy głównego `404.html`. Nagłówki bezpieczeństwa i CSP są w `frontend/public/_headers`. Dopuszczają używane fonty Google, API OpenF1 oraz zdjęcia i radio z domen F1. Lokalny `npm run preview` nie interpretuje `_headers`; do sprawdzenia zachowania Pages po buildzie użyj z katalogu repozytorium `npx wrangler pages dev`.

GitHub Actions sprawdza instalację z lockfile, typy, lint, audyt zależności i build. Przed produkcją sprawdź wdrożenie próbne: bezpośrednie wejścia i odświeżanie podstron, pierwszy odczyt bez cache, replay, radio i widok mobilny. Skontroluj konsolę pod kątem błędów CSP. Następnie podepnij domenę w Pages; w razie problemów przywróć poprzednie wdrożenie w panelu Cloudflare.

## Struktura

- `frontend/src/features` — ekrany aplikacji.
- `frontend/src/api/openf1` — klient i typy API.
- `frontend/src/analytics` — obliczenia i model replay.
- `frontend/src/components` — wspólne komponenty i wykresy.
- `RaceGrid_Tracks` — źródłowa biblioteka torów.
- `docs`, `DESIGN_SYSTEM.md`, `UI_RULES.md` — dokumentacja wyglądu.
- `ui-snapshots` — zapisane warianty wcześniejszego interfejsu.

Projekt niezależny od Formula 1. Źródło danych: [OpenF1](https://openf1.org/). Prawa do danych, znaków i zdjęć należą do ich właścicieli. Biblioteka `thinking-orbs` zachowuje własną licencję MIT w `frontend/src/vendor/thinking-orbs`.
