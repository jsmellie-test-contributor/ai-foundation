#!/usr/bin/env bash
# SessionStart hook target: install npm dependencies in cloud sessions only.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

npm install --no-save --no-audit --no-fund
