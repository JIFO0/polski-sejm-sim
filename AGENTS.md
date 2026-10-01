<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Client-only scenario persistence uses browser localStorage and URL hashes, because sharing and saved slots do not require a backend.
- Turnout influence is represented by three sensitivity states: lower, neutral, and higher, so touch controls and drag-and-drop share one model.
- Project background and author information live on the dedicated `/o-projekcie` route so the simulator remains task-focused and search engines can index the content independently.
- Historical election results are read-only PKW reference data, never loadable simulator presets, so user-created scenarios remain distinct.
- Scenario support values are stored as raw percentages; independent-support mode preserves an unassigned pool, while standard mode scales other parties to 100%.
- Anonimowe statystyki i udostępnianie linków: działają niezależnie od Lovable w lokalnym magazynie SQLite (`src/lib/server-db.server.ts`) z twardym limitem 4 GB i automatycznym czyszczeniem. Udostępnianie pozwala na maksymalnie 5 aktywnych linków na IP (ważność 7 dni). Statystyki są w 100% anonimowe (brak ciasteczek, brak IP, brak PII), zgodne z RODO bez konieczności zgód/banerów. Podgląd dla właściciela na `/statystyki` (login JIFO + klucz `ANALYTICS_KEY`).
- Custom parties and joint lists live in the scenario (customParties, mergers) and are mirrored into the global party registry via syncCustomEntities, so existing components keep using PARTY_MAP; their images stay only in browser localStorage and never enter shared links.
