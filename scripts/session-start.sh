#!/usr/bin/env bash
set -euo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

npm install --no-save --no-audit --no-fund

if [ -n "${AIF_BUNDLES:-}" ]; then
  node bin/aif.js install -B "$AIF_BUNDLES" -H claude \
    || echo "WARNING: aif install failed for AIF_BUNDLES=$AIF_BUNDLES" >&2
fi
