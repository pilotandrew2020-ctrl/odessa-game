#!/bin/sh
# Rebuild the code knowledge graph (graphify-out/) — code only, no LLM, no API key, ~10 s. Installs graphify first if it is missing.
# Usage: tools/graphify_refresh.sh        (also run by the SessionStart hook, in the background, see .claude/settings.json)
cd "$(dirname "$0")/.." || exit 0
export PATH="$HOME/.local/bin:$PATH"
if ! command -v graphify >/dev/null 2>&1; then
  if command -v uv >/dev/null 2>&1; then uv tool install graphifyy >/dev/null 2>&1
  elif command -v pipx >/dev/null 2>&1; then pipx install graphifyy >/dev/null 2>&1
  else pip install --quiet graphifyy >/dev/null 2>&1; fi
fi
command -v graphify >/dev/null 2>&1 || { echo "graphify is not installed (uv tool install graphifyy)"; exit 0; }
# graphify_src/index.game.js is a generated copy of the inline game script (see graphify_prep.py). A stub of it is tracked so that git does not
# ignore the folder (graphify honours .gitignore and .git/info/exclude and would skip it); skip-worktree keeps the regenerated copy out of `git status` and commits.
python3 tools/graphify_prep.py || exit 0
if [ -d .git ]; then git update-index --skip-worktree graphify_src/index.game.js 2>/dev/null || true; fi
GRAPHIFY_BACKEND=none graphify update . 2>&1 | tail -3
