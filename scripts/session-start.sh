#!/usr/bin/env bash
# Cloud SessionStart hook (Plan AIF-008, Task 004).
#
# Runs only in Claude Code cloud sessions. Installs this repo's own npm
# dependencies (`npm install --ignore-scripts`: `npm link` alone does not
# provide them, so `aif` would fail on its first import), puts ai-git and aif
# on PATH with `npm link --ignore-scripts`, installs the bundles named in
# AIF_BUNDLES, then runs `ai-git doctor` to report (never fix) whether ai-git,
# gh, bws and the token resolve. It downloads nothing else: gh and bws come
# from the environment's Setup script (see README, "Claude Code Cloud").
# Every step warns on failure and the hook still exits 0.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

project_dir="${CLAUDE_PROJECT_DIR:-}"
if [ -z "$project_dir" ]; then
  project_dir="$(git rev-parse --show-toplevel 2>/dev/null)" || project_dir=""
fi
if [ -z "$project_dir" ] || ! cd "$project_dir" 2>/dev/null; then
  echo "WARNING: cannot enter the project directory (CLAUDE_PROJECT_DIR='${CLAUDE_PROJECT_DIR:-}'); skipping session start" >&2
  exit 0
fi

npm install --ignore-scripts --no-save --no-audit --no-fund \
  || echo "WARNING: npm install failed; aif may be missing dependencies" >&2

npm link --ignore-scripts \
  || echo "WARNING: npm link failed; ai-git and aif may not be on PATH" >&2

if [ -n "${AIF_BUNDLES:-}" ]; then
  node bin/aif.js install -B "$AIF_BUNDLES" -H claude \
    || echo "WARNING: aif install failed for AIF_BUNDLES=$AIF_BUNDLES" >&2
fi

ai-git doctor \
  || echo "WARNING: ai-git doctor reported problems (see output above)" >&2
