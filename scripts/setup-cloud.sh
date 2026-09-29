#!/usr/bin/env bash
# Claude Code Cloud environment "Setup script" for ai-foundation.
#
# Paste this file's CONTENTS into the environment's "Setup script" field.
# It runs as root before Claude Code launches, before the repo is
# guaranteed to be present, and its result is snapshotted and reused by
# later sessions — so it provisions the VM only and never touches repo
# files or real secrets. Repo setup (npm) lives in the SessionStart hook:
# .claude/settings.json -> scripts/install-deps.sh. Secrets belong in the
# environment's "Environment variables" field.
#
# Must exit 0 (a non-zero exit fails session start) and finish in roughly
# five minutes (otherwise the environment isn't cached). gh, Node 22 and
# cargo are pre-installed; only bws is missing. Its release binaries live
# in an unattached GitHub repo (403 via the session proxy), so build it
# from crates.io, which the default Trusted network level allows.
set -uo pipefail

if command -v bws >/dev/null 2>&1; then
  bws --version
else
  echo "==> Installing bws (Bitwarden Secrets Manager CLI) via cargo"
  cargo install bws --locked \
    || echo "WARNING: bws install failed — ai-git secrets.run will be unavailable." >&2
fi

exit 0
