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
