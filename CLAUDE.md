## graphify

This project has a code knowledge graph at `graphify-out/` (god nodes, communities, cross-file relationships). It is built from the `*.js` files and from the big inline script of `index.html`.

Rules:
- When `graphify-out/graph.json` exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- Almost all game logic is the inline script of `index.html`. The graph sees it as `graphify_src/index.game.js`, a generated copy whose line numbers are exactly those of `index.html` (a hit at `index.game.js L6890` is `index.html` line 6890). Edit `index.html`, never that copy: only a one-line stub of it is committed.
- After modifying code, run `tools/graphify_refresh.sh` (AST only, no LLM, no API cost, a few seconds) to keep the graph current. It installs graphify first if it is missing and regenerates `graphify_src/index.game.js`.
- `graphify-out/` is not committed (see `.gitignore`). The SessionStart hook in `.claude/settings.json` builds it in the background at the start of every session (about a minute the first time, because graphify is installed then; the log is `/tmp/graphify_refresh.log`). If `graphify-out/graph.json` does not exist yet, grep normally.
- The graph is a snapshot and covers the `*.js` files and `index.html`; `lib/` (vendored three.js etc.), `assets/` and binary data are left out on purpose (`.graphifyignore`). Use grep for exact text (strings, CSS, HTML markup).

## ponytail

The ponytail plugin ("write only what the task needs") is enabled in `.claude/settings.json`, pinned to release `v5.3.3` (its hooks were read before pinning: they only run local scripts, nothing leaves the machine) and set to the light level (`PONYTAIL_DEFAULT_MODE=lite`).
- It saves tokens by keeping code short. It must never be a reason to leave out a feature the owner asked for: this game is feature-rich on purpose, so build everything that was asked, just without extra abstractions.
- Levels: `/ponytail lite|full|ultra`, `/ponytail off`, or say "stop ponytail" / "normal mode". To update the plugin, change the `ref` in `.claude/settings.json` only after reading the new hooks.

## Where the game lives

The real game is the Vercel project **`odessa_chick`** (https://odessachick.vercel.app, production = branch `main`, every merge deploys by itself). That is the only place the owner plays (on an iPad). After merging a PR, check its latest production deployment (Vercel connector: `list_deployments`, project `prj_1AHUe5gTv4PihMekPBofy6Q52EAO`, target `production`) and tell the owner to clear the site data in Safari.
- Not used by the owner, do not report on them: the Vercel project `good_odessa` (a second copy), GitHub Pages, Cloudflare (the owner left it; there is an old Worker `odessa`, leave it alone).
- Connectors that are worth using here: Vercel (deployments, errors) and MDN (web docs). Sentry has no project yet; Hugging Face ("Pictures") and Higgsfield only when the owner wants generated media.

## Cost rules (the owner's request, 2026-11-17: fewer credits, less talk, more work)
- Reply short: what was done, what is NOT verified, what the owner must do. No recaps, no option lists, no long explanations unless asked.
- Do not call MCP tools or screenshot / re-read images unless the task needs them; one look per change, not five. Do not poll or re-run tests that already passed.
- Subagents (only when a task is big or parallel; the owner allowed it): easy search / mechanical edits -> `model: "haiku"` or `"sonnet"`; hard design / debugging -> `"opus"`. The main session's model is the owner's `/model` choice: suggest `/model opus` for hard tasks, `/model sonnet` for easy ones; never switch it silently.
- Music: only royalty-free / CC0 tracks go into `assets/music/` (the owner's Weeknd video was NOT used: copyrighted, the site is public).


## Which model for what (the owner forgets: remind him at the start of a task, in one line)
- **Sonnet** (`/model sonnet`): everyday work. Colours, small fixes, UI texts, adding a button, tests, PRs, merges, notes, short answers. Cheapest on the limit.
- **Opus** (`/model opus`): hard work. Performance / crashes (profiling), tricky bugs with no clear cause, shader and rendering changes, rigging / model pipelines, big refactors, anything where two attempts with Sonnet failed.
- **Fable** (`/model fable`): the heaviest. Only for a big design job done once (a whole new system such as a new city district generator, a new game mode) or a very hard debugging session. It eats the limit fast: never for routine edits.
- Rule of thumb: start with Sonnet; switch up only when the task is hard; switch back down afterwards. Say which one before starting a task.
