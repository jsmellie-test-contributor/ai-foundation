/**
 * Integration tests for .github/scripts/check-version-bumps.mjs against real
 * git repos.
 *
 * Covers both CLI modes:
 *   - `sha` mode (pushes to `main`, which has no parent branch to fork-detect
 *     against — it diffs against its own previous tip, or skips when there
 *     is none, e.g. the very first push to the repo).
 *   - `auto-parent` mode (pushes to any other branch): it must diff against
 *     the tip of whichever still-existing branch this one was most recently
 *     forked from, not always `main` — including the nested case (a branch
 *     cut from a feature branch, not from `main` directly) and the fallback
 *     case (that feature branch has since been merged and deleted).
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT_PATH = resolve(import.meta.dirname, '../../.github/scripts/check-version-bumps.mjs');
const DOC_PATH = 'doc.md';

function frontmatter(version, body) {
  return `---\nversion: ${version}\n---\n# Doc\n\n${body}\n`;
}

function runGit(cwd, args, env) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
  return result;
}

// Deterministic, strictly increasing commit timestamps so merge-base
// "most recent" ranking never depends on wall-clock test execution speed.
let commitClock = 1700000000;

function commit(cwd, message) {
  const date = new Date((commitClock += 60) * 1000).toISOString();
  runGit(cwd, ['add', '-A']);
  runGit(cwd, ['commit', '-q', '-m', message], {
    GIT_AUTHOR_DATE: date,
    GIT_COMMITTER_DATE: date,
  });
}

function writeDoc(cwd, version, body) {
  writeFileSync(join(cwd, DOC_PATH), frontmatter(version, body), 'utf8');
}

/** Mirrors `refs/remotes/origin/<branch>` onto the current tip of <branch>. */
function publishBranch(cwd, branch) {
  runGit(cwd, ['update-ref', `refs/remotes/origin/${branch}`, `refs/heads/${branch}`]);
}

function setUpRepo() {
  const root = mkdtempSync(join(tmpdir(), 'version-bump-test-'));
  runGit(root, ['init', '-q', '-b', 'main']);
  runGit(root, ['config', 'user.name', 'Test User']);
  runGit(root, ['config', 'user.email', 'test@example.com']);
  writeDoc(root, '1.0.0', 'initial content');
  commit(root, 'initial commit');
  publishBranch(root, 'main');
  return root;
}

function runCheck(cwd, args) {
  const result = spawnSync('node', [SCRIPT_PATH, ...args], { cwd, encoding: 'utf8' });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('integration: check-version-bumps.mjs', () => {
  let repo;

  beforeEach(() => {
    repo = setUpRepo();
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  describe('sha mode (pushes to main — no parent branch)', () => {
    it('skips when there is no previous commit to diff against (first push ever)', () => {
      const { code, stdout } = runCheck(repo, ['sha', '']);
      assert.equal(code, 0);
      assert.match(stdout, /skipping version-bump check/);
    });

    it('skips on the all-zeros SHA GitHub sends for a brand-new ref', () => {
      const { code, stdout } = runCheck(repo, ['sha', '0000000000000000000000000000000000000000']);
      assert.equal(code, 0);
      assert.match(stdout, /skipping version-bump check/);
    });

    it('fails a push to main that changes a versioned file without bumping it', () => {
      const before = runGit(repo, ['rev-parse', 'HEAD']).stdout.trim();
      writeDoc(repo, '1.0.0', 'changed content, forgot to bump');
      commit(repo, 'edit without bump');

      const { code, stdout } = runCheck(repo, ['sha', before]);
      assert.equal(code, 1);
      assert.match(stdout, /content changed but version stayed at '1\.0\.0'/);
    });

    it('passes a push to main that bumps the version', () => {
      const before = runGit(repo, ['rev-parse', 'HEAD']).stdout.trim();
      writeDoc(repo, '1.1.0', 'changed content, bumped');
      commit(repo, 'edit with bump');

      const { code, stdout } = runCheck(repo, ['sha', before]);
      assert.equal(code, 0);
      assert.match(stdout, /all bumped correctly/);
    });
  });

  describe('auto-parent mode — single-level fork', () => {
    it('skips when no other branch exists to diff against', () => {
      runGit(repo, ['checkout', '-q', '-b', 'lonely-branch']);
      writeDoc(repo, '1.1.0', 'edit');
      commit(repo, 'edit');
      publishBranch(repo, 'lonely-branch');
      // Simulate a lone branch: no origin/main and no other origin refs.
      runGit(repo, ['update-ref', '-d', 'refs/remotes/origin/main']);

      const { code, stdout } = runCheck(repo, ['auto-parent', 'lonely-branch']);
      assert.equal(code, 0);
      assert.match(stdout, /No other branch found/);
    });

    it('fails a branch cut from main that changes a versioned file without bumping it', () => {
      runGit(repo, ['checkout', '-q', '-b', 'feature']);
      writeDoc(repo, '1.0.0', 'changed content, forgot to bump');
      commit(repo, 'edit without bump');
      publishBranch(repo, 'feature');

      const { code, stdout } = runCheck(repo, ['auto-parent', 'feature']);
      assert.equal(code, 1);
      assert.match(stdout, /Detected parent branch: refs\/remotes\/origin\/main/);
      assert.match(stdout, /content changed but version stayed at '1\.0\.0'/);
    });

    it('passes a branch cut from main that bumps the version', () => {
      runGit(repo, ['checkout', '-q', '-b', 'feature']);
      writeDoc(repo, '1.1.0', 'changed content, bumped');
      commit(repo, 'edit with bump');
      publishBranch(repo, 'feature');

      const { code, stdout } = runCheck(repo, ['auto-parent', 'feature']);
      assert.equal(code, 0);
      assert.match(stdout, /all bumped correctly/);
    });

    it('does not re-demand a bump on a later push that only fixes a typo', () => {
      runGit(repo, ['checkout', '-q', '-b', 'feature']);
      writeDoc(repo, '1.1.0', 'changed content, bumped');
      commit(repo, 'edit with bump');
      publishBranch(repo, 'feature');

      // A follow-up push on the SAME branch that fixes a typo but doesn't
      // touch the version field further — this is the exact case that used
      // to fail when the check compared against the previous push instead
      // of the branch's actual fork point.
      writeDoc(repo, '1.1.0', 'changed content, bumped, typo fixed');
      commit(repo, 'fix typo');
      publishBranch(repo, 'feature');

      const { code, stdout } = runCheck(repo, ['auto-parent', 'feature']);
      assert.equal(code, 0);
      assert.match(stdout, /all bumped correctly/);
    });
  });

  describe('auto-parent mode — nested fork (branch cut from a branch)', () => {
    it('detects the immediate parent branch, not main, and catches a missed bump main would hide', () => {
      // main: doc @ 1.0.0
      runGit(repo, ['checkout', '-q', '-b', 'feature-x']);
      writeDoc(repo, '1.1.0', 'feature-x content');
      commit(repo, 'feature-x bumps the version');
      publishBranch(repo, 'feature-x');

      runGit(repo, ['checkout', '-q', '-b', 'child']);
      // child edits the doc further but forgets to bump past feature-x's 1.1.0.
      writeDoc(repo, '1.1.0', 'feature-x content, plus a child edit');
      commit(repo, 'child edits without bumping further');
      publishBranch(repo, 'child');

      const { code, stdout } = runCheck(repo, ['auto-parent', 'child']);
      assert.equal(code, 1);
      assert.match(stdout, /Detected parent branch: refs\/remotes\/origin\/feature-x/);
      assert.match(stdout, /content changed but version stayed at '1\.1\.0'/);

      // Sanity check on the premise: comparing against main directly (the
      // old, non-recursive behavior) would have missed this entirely, since
      // main's doc is still at 1.0.0 and child's is at 1.1.0 — a false pass.
      const mainSha = runGit(repo, ['rev-parse', 'refs/remotes/origin/main']).stdout.trim();
      const naive = runCheck(repo, ['sha', mainSha]);
      assert.equal(naive.code, 0, 'comparing against main alone would have wrongly passed');
    });

    it('passes when the nested branch bumps the version past its immediate parent', () => {
      runGit(repo, ['checkout', '-q', '-b', 'feature-x']);
      writeDoc(repo, '1.1.0', 'feature-x content');
      commit(repo, 'feature-x bumps the version');
      publishBranch(repo, 'feature-x');

      runGit(repo, ['checkout', '-q', '-b', 'child']);
      writeDoc(repo, '1.2.0', 'feature-x content, plus a properly bumped child edit');
      commit(repo, 'child bumps further');
      publishBranch(repo, 'child');

      const { code, stdout } = runCheck(repo, ['auto-parent', 'child']);
      assert.equal(code, 0);
      assert.match(stdout, /Detected parent branch: refs\/remotes\/origin\/feature-x/);
    });

    it('falls back to the next surviving ancestor once the immediate parent branch is deleted', () => {
      runGit(repo, ['checkout', '-q', '-b', 'feature-x']);
      writeDoc(repo, '1.1.0', 'feature-x content');
      commit(repo, 'feature-x bumps the version');
      publishBranch(repo, 'feature-x');

      runGit(repo, ['checkout', '-q', '-b', 'child']);
      writeDoc(repo, '1.2.0', 'child bumps further');
      commit(repo, 'child bumps further');
      publishBranch(repo, 'child');

      // feature-x has since been merged into main and its branch deleted —
      // its commits remain reachable through child's history, but there's
      // no origin ref for it anymore.
      runGit(repo, ['update-ref', '-d', 'refs/remotes/origin/feature-x']);

      const { code, stdout } = runCheck(repo, ['auto-parent', 'child']);
      assert.equal(code, 0);
      assert.match(stdout, /Detected parent branch: refs\/remotes\/origin\/main/);
    });
  });
});
