#!/usr/bin/env bash
# Claude Code Cloud environment setup script for ai-foundation.
#
# Paste this file's path (or its contents) into the cloud environment's
# "Setup script" field. It only installs tooling — its output is cached in
# the environment's filesystem snapshot and reused across sessions, so it
# must never touch real secrets (see docs/plans/secrets-resolution-plan.md,
# "Cloud Testing Setup"). Secrets belong in the environment's "Environment
# variables" field instead.
#
# Idempotent: safe to re-run manually inside a live session if a tool
# turns out to be missing.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "==> Node: $(node --version 2>/dev/null || echo 'not found')"
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js 22+ is required and was not found on PATH." >&2
  exit 1
fi

echo "==> Installing npm dependencies (npm ci)"
npm ci

echo "==> Checking for GitHub CLI (gh)"
if command -v gh >/dev/null 2>&1; then
  gh --version | head -1
else
  echo "gh not found — required by 'ai-git' for GitHub operations (PRs, issues)."
  echo "Installing via apt..."
  if command -v apt-get >/dev/null 2>&1; then
    (type -p wget >/dev/null || (sudo apt-get update && sudo apt-get install -y wget)) \
      && sudo mkdir -p -m 755 /etc/apt/keyrings \
      && wget -nv -O /etc/apt/keyrings/githubcli-archive-keyring.gpg https://cli.github.com/packages/githubcli-archive-keyring.gpg \
      && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
      && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null \
      && sudo apt-get update \
      && sudo apt-get install -y gh
  else
    echo "WARNING: apt-get not available — install gh manually." >&2
  fi
fi

echo "==> Checking for Bitwarden Secrets Manager CLI (bws)"
if command -v bws >/dev/null 2>&1; then
  bws --version
else
  echo "bws not found — required by 'ai-git' when .aiconfig.json's secrets.run is configured."
  if command -v cargo >/dev/null 2>&1; then
    echo "Installing via cargo (crates.io is in the default Trusted network allowlist)..."
    cargo install bws --locked
  else
    echo "WARNING: cargo not available — install bws manually (https://bitwarden.com/help/secrets-manager-cli/)." >&2
  fi
fi

echo "==> Verifying repo (lint, typecheck, validate)"
npm run lint
npm run typecheck
npm run validate

echo "==> Setup complete"
