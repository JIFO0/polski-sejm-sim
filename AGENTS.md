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
