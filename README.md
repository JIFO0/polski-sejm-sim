# Polski Sejm Sim

An interactive simulator for the Polish Sejm elections (460 seats across 41 constituencies) using the D'Hondt method.

## Features

- **41-Constituency Interactive Map**: Inspect and adjust party support and voter turnout sensitivity (`lower`, `neutral`, `higher`) per constituency.
- **D'Hondt Seat Allocation**: Calculates seat distributions with statutory 5% party and 8% coalition thresholds, plus minority exemptions.
- **Poll-Driven Baseline**: Computes a weighted national polling average from primary polls in `src/data/polls.json` and projects it onto the 41 constituencies.
- **Coalition & Group Builder**: Combine parties into parliamentary groups or joint lists (`mergers`) to test majority thresholds (231+ seats).
- **Custom Parties & Scenarios**: Create custom parties, switch between standard (100% normalized) and independent-support modes, and compare against read-only historical PKW election results.
- **Save, Share & Export**:
  - Save scenarios locally in `localStorage` or export/import as JSON.
  - Share scenarios via URL hashes or short links.
  - Generate deterministic social media graphics of simulation results and coalition majorities directly in the browser.
- **Bilingual UI & Theming**: Full Polish and English interface with light/dark theme support.
- **Dedicated Reference Pages**: Poll sources and methodology (`/zrodla`), D'Hondt method guide (`/metoda-dhondta`), and project background (`/o-projekcie`).

## Tech Stack

- **Framework**: React 19, TypeScript, Vite, TanStack Router & TanStack Start
- **Styling & UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Maps & Charts**: MapLibre GL, Recharts
- **Server & Storage**: Nitro, local SQLite (`src/lib/server-db.server.ts`) for short links and anonymous, cookie-free analytics

## Local Development

Requires Node.js and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

Useful scripts:

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run lint` — run ESLint
- `npm run format` — format code with Prettier

## Polls and the SejmSim Average

SejmSim is a non-commercial civic project and does not copy third-party polling averages. The national baseline used by the simulator is calculated in `src/lib/poll-average.ts` from primary poll entries in `src/data/polls.json`.

Methodology summary (full details are available in the source code and on `/zrodla`):

- Only polls with a publication date and results are included.
- By default, polls from the last 30 days are used; if fewer than 4 are available, older polls are included up to a maximum of 12.
- Weight = recency (halves every 14 days) x (sample size / 1000).
- Missing sample size defaults to a sample weight of 1 without fabricating respondent counts.
- A party omitted from a poll is not treated as 0%.
- During election silence (`src/data/election-silence.json`), new poll results are not published or included in the average.

District profiles in `src/data/districts.ts` distribute the national average across the 41 constituencies.

### Adding a New Poll

Append an object to the array in `src/data/polls.json`. Leave unknown fields as `null` rather than guessing.

```json
{
  "id": "example-institute-2026-10-01",
  "institute": "Polling Institute Name",
  "commissioner": "Commissioner or null",
  "fieldworkFrom": "2026-09-28",
  "fieldworkTo": "2026-09-30",
  "publishedAt": "2026-10-01",
  "sampleSize": 1000,
  "method": "CATI",
  "methodDetail": null,
  "publicationTitle": null,
  "results": { "ko": 32.0, "pis": 28.0, "konf": 12.0 },
  "sourceUrl": "https://example.com/poll-publication"
}
```

- `method`: `CATI`, `CAWI`, `mix`, or `null`. Optional `methodDetail` and `publicationTitle` fields may be omitted.
- `results`: Keys are party IDs from `src/data/parties.ts` (`ko`, `pis`, `konf`, `kkp`, `nl`, `razem`, `rp`, `psl`, `pl2050`, `inne`) with percentage values.
- `sourceUrl`: Must link to the original source publication, not a third-party aggregator.
- `id`: Must be unique and stable.

### Election Silence

Election silence windows are configured in `src/data/election-silence.json`:

```json
{
  "label": "Wybory do Sejmu",
  "from": "2027-10-16T00:00:00+02:00",
  "until": "2027-10-17T21:00:00+02:00"
}
```

`from` marks the start of election silence (24 hours before election day) and `until` marks the close of voting. Within this window, the site hides polls published after `from` and excludes them from the average.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`).
