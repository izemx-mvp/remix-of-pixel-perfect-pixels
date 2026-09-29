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
- Simulated AI insights live in src/lib/ai.ts (pure functions over store data) — keeps every screen's recommendations coherent without a backend.
- AI is embedded per module (AiNote/AiBadge in ui-kit + global ChatBubble in AppShell); no standalone "Agents IA" page — per product brief.
