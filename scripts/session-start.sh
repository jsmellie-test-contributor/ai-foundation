#!/usr/bin/env bash
# Cloud SessionStart hook (Plan AIF-008, Task 004).
#
# Runs only in Claude Code cloud sessions. Puts ai-git and aif on PATH with
# `npm link --ignore-scripts`, installs the bundles named in AIF_BUNDLES, then
# runs `ai-git doctor` to report (never fix) whether ai-git, gh, bws and the
# token resolve. It never installs anything from the network beyond what
# `npm link` fetches for this repo's own dependencies; gh and bws come from
# the environment's Setup script (see README, "Claude Code Cloud").
# Every step warns on failure and the hook still exits 0.
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

npm link --ignore-scripts \
  || echo "WARNING: npm link failed; ai-git and aif may not be on PATH" >&2

if [ -n "${AIF_BUNDLES:-}" ]; then
  node bin/aif.js install -B "$AIF_BUNDLES" -H claude \
    || echo "WARNING: aif install failed for AIF_BUNDLES=$AIF_BUNDLES" >&2
fi

ai-git doctor \
  || echo "WARNING: ai-git doctor reported problems (see output above)" >&2
