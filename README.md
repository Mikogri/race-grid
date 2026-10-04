# RaceGrid

Aplikacja webowa do przeglądania i analizy Formuły 1: kalendarz, wyniki sesji, klasyfikacje, profile kierowców i zespołów oraz informacje o torach. Oferuje także porównania kierowców i telemetrii, analizę tempa i strategii, trendy oraz odtwarzanie wyścigów na mapie toru.

## Jak działa

Frontend jest napisany w **React + TypeScript + Vite**, z React Router i TanStack Query. Pobiera dane bezpośrednio z **OpenF1 API** (`https://api.openf1.org/v1`) — projekt nie ma własnego backendu ani bazy danych. Klient API kolejkuje żądania, obsługuje ponowienia i zapisuje odpowiedzi w pamięci podręcznej przeglądarki.

Analizy są obliczane lokalnie na podstawie danych API. Biblioteka `RaceGrid_Tracks` dostarcza geometrię torów, sektory i okrążenia referencyjne; skrypty przygotowują z niej pliki dla interfejsu. Replay łączy dane pozycji, telemetrii, pit stopów, pogody i komunikatów wyścigowych.

Dane obejmują sezony od 2023 roku, zależnie od dostępności w OpenF1. Dane historyczne są pobierane bez klucza API; dostęp do danych podczas trwających sesji może być ograniczony. Mapy i wskaźniki analityczne są przybliżeniami, a nie oficjalnymi pomiarami F1.

## Uruchomienie

Wymagany Node.js **22.12+** (lub nowsza wspierana wersja, np. 24) i npm.

```bash
cd frontend
npm ci
npm run dev -- --port 5174
```

Aplikacja: `http://localhost:5174`. Skrypty przed startem przygotowują tory i pobierają zdjęcia kierowców, więc pierwsze uruchomienie wymaga internetu. Opcjonalny Real-ESRGAN poprawia zdjęcia, jeśli jest dostępny; nie jest wymagany.

```bash
npm run typecheck
npm run lint
npm run build
npm run preview
```

## Struktura

- `frontend/src/features` — ekrany aplikacji.
- `frontend/src/api/openf1` — klient i typy API.
- `frontend/src/analytics` — obliczenia i model replay.
- `frontend/src/components` — wspólne komponenty i wykresy.
- `RaceGrid_Tracks` — źródłowa biblioteka torów.
- `docs`, `DESIGN_SYSTEM.md`, `UI_RULES.md` — dokumentacja wyglądu.
- `ui-snapshots` — zapisane warianty wcześniejszego interfejsu.

Projekt niezależny od Formula 1. Źródło danych: [OpenF1](https://openf1.org/). Prawa do danych, znaków i zdjęć należą do ich właścicieli. Biblioteka `thinking-orbs` zachowuje własną licencję MIT w `frontend/src/vendor/thinking-orbs`.
