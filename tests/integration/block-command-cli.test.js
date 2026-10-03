// ------------------------------
// block-command-cli.test.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-007
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Integration tests for the block-command hook CLI: spawns the real `cli.js`
 * with PreToolUse payloads on stdin and asserts exit code and stderr, both
 * from the source asset and from a copy installed the way `aif install` does
 * it (logic.js + cli.js only, no node_modules).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TARGETS, installBlockCommandResource } from '../../lib/harnesses/claude.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_CLI = join(
  __dirname,
  '..',
  '..',
  'lib',
  'harnesses',
  'assets',
  'block-command',
  'cli.js',
);
const PATTERNS = ['git *', 'gh *'];

/**
 * Runs a hook CLI with the given stdin.
 * @param {string} cli - Absolute path to cli.js
 * @param {string} stdin - Raw stdin text
 * @param {string[]} [patterns]
 * @returns {{status: number, stderr: string}}
 */
function run(cli, stdin, patterns = PATTERNS) {
  const r = spawnSync(process.execPath, [cli, ...patterns], {
    input: stdin,
    encoding: 'utf8',
    cwd: tmpdir(),
  });
  return { status: r.status, stderr: r.stderr };
}

/** @param {string} command */
const payload = (command) => JSON.stringify({ tool_name: 'Bash', tool_input: { command } });

/**
 * Shared scenarios, run against each CLI location.
 * @param {() => string} getCli
 */
function defineScenarios(getCli) {
  const blocked = (command) => run(getCli(), payload(command));

  it('blocks raw git and names the pattern, ai-git, and the identity rule', () => {
    const r = blocked('git status');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /matches pattern 'git \*'/);
    assert.match(r.stderr, /ai-git/);
    assert.match(r.stderr, /never supply, infer or ask for a git identity/i);
    assert.match(r.stderr, /\.aiconfig\.json/);
  });

  it('blocks bare gh and the other pattern', () => {
    const r = blocked('gh');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /matches pattern 'gh \*'/);
  });

  for (const cmd of [
    'cd x && git log',
    'echo hi | git apply',
    '/usr/bin/git log',
    'FOO=1 git log',
    'bash -c "git log"',
    'git commit -m "a\nb"',
    'bws run -- git log',
    'op run -- git log',
    'flock /tmp/l git log',
    'git -c user.name=x -c user.email=y commit -m m',
    'GIT_AUTHOR_NAME=x git commit -m m',
  ]) {
    it(`blocks ${JSON.stringify(cmd)}`, () => {
      assert.equal(blocked(cmd).status, 2);
    });
  }

  it('blocks a heredoc commit message that runs git in an unquoted body', () => {
    const r = blocked('cat <<EOF\n$(git log)\nEOF');
    assert.equal(r.status, 2);
  });

  it('blocks a dynamic command word with the dynamic-word message', () => {
    const r = blocked('g=git; $g log');
    assert.equal(r.status, 2);
    assert.match(r.stderr, /dynamic command word/);
    assert.match(r.stderr, /literally/);
    assert.match(r.stderr, /ai-git/);
    assert.match(r.stderr, /never supply, infer or ask for a git identity/i);
  });

  for (const cmd of [
    'echo "git status"',
    'grep git README.md',
    'cat .gitignore',
    'git-lfs ls-files',
    'ai-git commit -m "git push fixed"',
    '/opt/node22/bin/ai-git push',
    'node /x/bin/ai-git.js status',
    'bws run --project-id p -- ai-git push',
    'command -v git',
    'GIT_AUTHOR_NAME=x ai-git commit -m m',
    'export FOO=bar',
    '$HOME/.local/bin/tool --flag',
    '"$PWD/node_modules/.bin/eslint" .',
    '${CLAUDE_PROJECT_DIR}/scripts/x.sh',
    'ls',
  ]) {
    it(`allows ${JSON.stringify(cmd)}`, () => {
      const r = blocked(cmd);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stderr, '');
    });
  }

  describe('fail open', () => {
    it('allows an unterminated heredoc and unbalanced constructs', () => {
      for (const cmd of [
        'cat <<EOF\nno terminator',
        'echo "unterminated',
        'echo $(unclosed',
        '(((',
      ]) {
        assert.equal(blocked(cmd).status, 0, cmd);
      }
    });

    it('allows invalid JSON, empty stdin, and missing or non-string command', () => {
      const cli = getCli();
      for (const stdin of [
        'not json',
        '',
        '{}',
        JSON.stringify({ tool_input: {} }),
        JSON.stringify({ tool_input: { command: 42 } }),
        'null',
      ]) {
        const r = run(cli, stdin);
        assert.equal(r.status, 0, JSON.stringify(stdin));
      }
    });

    it('allows everything when no patterns are passed', () => {
      assert.equal(run(getCli(), payload('git status'), []).status, 0);
    });
  });
}

describe('integration: block-command CLI (source asset)', () => {
  defineScenarios(() => SOURCE_CLI);
});

describe('integration: block-command CLI (installed copy)', () => {
  let tempScripts;
  let originalScripts;
  let installedCli;

  before(() => {
    tempScripts = mkdtempSync(join(tmpdir(), 'aif-block-command-'));
    originalScripts = TARGETS.scripts;
    TARGETS.scripts = tempScripts;
    const origLog = console.log;
    console.log = () => {};
    try {
      const installed = installBlockCommandResource(process.cwd());
      installedCli = installed.map((f) => f.path).find((p) => p.endsWith('cli.js'));
    } finally {
      console.log = origLog;
    }
  });

  after(() => {
    TARGETS.scripts = originalScripts;
    rmSync(tempScripts, { recursive: true, force: true });
  });

  it('installs only files that run standalone (no node_modules)', () => {
    assert.ok(installedCli);
    assert.ok(installedCli.startsWith(tempScripts));
  });

  defineScenarios(() => installedCli);
});
