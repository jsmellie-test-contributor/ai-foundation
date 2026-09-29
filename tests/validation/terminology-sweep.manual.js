// ------------------------------
// terminology-sweep.manual.js
//
// Plan: process-model check 25
//
// Not part of the default test run — excluded from `npm test`'s
// "**/*.test.js" glob on purpose, since the Chunk/Epic → Feature/Task
// rename it guards is complete and this is no longer a standing gate.
// Run it by hand when you want to re-check the vocabulary sweep:
//
//   node --test tests/validation/terminology-sweep.manual.js
// ------------------------------

/**
 * Repo-wide guard against the retired Epic/Chunk vocabulary creeping back in.
 * Runs against every git-tracked file (git ls-files already respects
 * .gitignore, so build output and node_modules never enter the scan), with a
 * fixed set of path/file exceptions for content that is either historical
 * record or uses "chunk"/"epic" as unrelated, non-planning vocabulary.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

// This file's own path, relative to ROOT, in the same slash-separated form
// git ls-files produces — it necessarily names the words it's checking for
// (comments, the regex literal, describe/it strings), so it must exempt
// itself rather than be caught by its own sweep once committed.
const SELF_PATH = relative(ROOT, fileURLToPath(import.meta.url))
  .split(/[\\/]/)
  .join('/');

// Whole-word, case-insensitive — a bare substring match false-positives on
// things like "chunking" or "FilePicker".
const TERM_PATTERN = /\b(chunk|epic)\b/i;

// Path prefixes excluded entirely: historical archives, the flat decisions
// tree (MADR record bodies + the generated index it produces), and two
// directories that use "chunk" as their own unrelated batching/streaming
// vocabulary (Gmail API batch limits, a Node stream's `chunk` event data).
const EXCLUDED_PREFIXES = [
  // Legacy Epic-era Features (AIF-001..004), moved into per-Feature folders
  // and kept as history. New Features must not be added here.
  'docs/plans/features/AIF-001/',
  'docs/plans/features/AIF-002/',
  'docs/plans/features/AIF-003/',
  'docs/plans/features/AIF-004/',
  'docs/plans/completed/',
  'docs/decisions/',
  'servers/gmail/',
  'lib/harnesses/assets/block-command/',
];

// Named exceptions — "kept-in-place history", same class as AIF-004.epic.md
// (covered by EXCLUDED_PREFIXES's archive/ entry) but living outside it.
const EXCLUDED_FILES = new Set([
  'docs/plans/agent-consolidation-plan.md',
  // Superseded YouTrack research, already self-marked stale.
  'docs/misc/youtrack-dr-issue-setup-notes.md',
  'docs/misc/youtrack-tracking-config-notes.md',
  // Status: Done plans awaiting check 34's move into docs/plans/completed/.
  'docs/plans/agent-prompt-simplification-plan.md',
  'docs/plans/commit-discipline-plan-gate-plan.md',
  'docs/plans/gmail-filter-and-batch-tools-plan.md',
  // The documents narrating this very rename inherently discuss the
  // vocabulary they're replacing.
  'docs/process-model.md',
  'docs/plans/process-model-implementation-tracker.md',
  'docs/plans/process-model-test-plan.md',
]);

function listTrackedFiles() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  return out.split('\n').filter((line) => line.length > 0);
}

function isExcluded(relPath) {
  if (relPath === SELF_PATH) return true;
  if (EXCLUDED_FILES.has(relPath)) return true;
  return EXCLUDED_PREFIXES.some((prefix) => relPath.startsWith(prefix));
}

function findMatches(relPath) {
  const content = readFileSync(join(ROOT, relPath), 'utf8');
  const matches = [];
  content.split('\n').forEach((line, index) => {
    if (TERM_PATTERN.test(line)) {
      matches.push(`${relPath}:${index + 1}: ${line.trim()}`);
    }
  });
  return matches;
}

describe('terminology sweep — chunk/epic retirement', () => {
  it('has zero chunk/epic matches outside the documented exceptions', () => {
    const files = listTrackedFiles().filter((f) => !isExcluded(f));
    const allMatches = files.flatMap(findMatches);

    assert.deepEqual(
      allMatches,
      [],
      `Found ${allMatches.length} stray chunk/epic match(es) outside the documented ` +
        `exceptions (see docs/process-model.md check 25):\n${allMatches.join('\n')}`,
    );
  });
});
