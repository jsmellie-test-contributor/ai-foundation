/**
 * arc42 architecture-section metadata parsing, index building, staleness
 * detection, and diffing for the `aif index architecture` command.
 *
 * Plan: docs/process-model.md check 5.
 *
 * Mirrors lib/decisions.js's pure/io split: parsing, index assembly, and
 * diffing are pure (staleness is injected as a predicate, not computed
 * inline, so the pure functions stay testable against synthetic fixtures
 * with no real git repo). The io wrappers at the bottom compose the pure
 * functions with real filesystem + git access.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

import { parseFrontmatter, nonFencedLines } from './file-utils.js';
import { entriesEqual } from './index-diff.js';

const REQUIRED_FIELDS = ['section', 'title', 'lifecycle', 'last_verified'];

/**
 * Extract the one-sentence summary blockquote after the H1. A blockquote may
 * wrap across multiple consecutive `>`-prefixed lines (most of this repo's
 * own arc42 docs do) — join them into one string rather than only the first
 * line, which would silently truncate mid-sentence.
 * @param {string} body - Section content after frontmatter
 * @returns {string} The joined summary, or '' if no blockquote is found
 */
function extractSummary(body) {
  const lines = body.split(/\r?\n/);
  const parts = [];
  let inQuote = false;

  for (const line of lines) {
    const match = line.match(/^>\s?(.*)$/);
    if (match) {
      inQuote = true;
      parts.push(match[1]);
    } else if (inQuote) {
      break;
    }
  }

  return parts.join(' ').trim();
}

/**
 * @typedef {object} ArchitectureRecord
 * @property {string} path
 * @property {string} section
 * @property {string} title
 * @property {string} summary
 * @property {string} lifecycle
 * @property {string[]} tags
 * @property {string[]} key_files
 * @property {string} last_verified
 */

/**
 * @typedef {object} ArchitectureIndexEntry
 * @property {string} path
 * @property {string} section
 * @property {string} title
 * @property {string} summary
 * @property {string} lifecycle
 * @property {string[]} tags
 * @property {string[]} key_files
 * @property {string} last_verified
 * @property {boolean} stale
 */

/**
 * Parse an arc42 section file's frontmatter (+ one-line blockquote summary)
 * into a structured record.
 * @param {string} content - Raw file content
 * @param {string} relPath - Path relative to paths.architecture
 * @returns {{ record: ArchitectureRecord } | { error: string }}
 */
export function parseArchitectureSection(content, relPath) {
  const { frontmatter, body } = parseFrontmatter(content);
  if (!frontmatter) {
    return { error: `${relPath}: missing YAML frontmatter` };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter[field]) {
      return { error: `${relPath}: missing required frontmatter field "${field}"` };
    }
  }

  return {
    record: {
      path: relPath,
      section: String(frontmatter.section),
      title: frontmatter.title,
      summary: extractSummary(body),
      lifecycle: frontmatter.lifecycle,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      key_files: Array.isArray(frontmatter.key_files) ? frontmatter.key_files : [],
      last_verified: String(frontmatter.last_verified),
    },
  };
}

/**
 * Invert key_files across every record: source path -> [doc paths].
 * Same inversion pattern as decisions.js's supersedes -> superseded_by.
 * @param {ArchitectureRecord[]} records
 * @returns {Record<string, string[]>}
 */
export function buildReverseIndex(records) {
  /** @type {Record<string, string[]>} */
  const reverse = {};

  for (const record of records) {
    for (const file of record.key_files) {
      if (!reverse[file]) reverse[file] = [];
      reverse[file].push(record.path);
    }
  }

  for (const file of Object.keys(reverse)) {
    reverse[file].sort();
  }

  return reverse;
}

/**
 * Build the full architecture index from parsed records.
 * `isStale` is injected rather than computed here — it's the only part of
 * this module that needs git/filesystem access, so keeping it a predicate
 * argument keeps this function pure and testable without a real repo.
 * @param {ArchitectureRecord[]} records
 * @param {(record: ArchitectureRecord) => boolean} isStale
 * @returns {{ generated_at: string, entries: ArchitectureIndexEntry[], reverse_index: Record<string, string[]> }}
 */
export function buildArchitectureIndex(records, isStale) {
  const entries = records.map((record) => ({
    path: record.path,
    section: record.section,
    title: record.title,
    summary: record.summary,
    lifecycle: record.lifecycle,
    tags: record.tags,
    key_files: record.key_files,
    last_verified: record.last_verified,
    stale: isStale(record),
  }));

  return {
    generated_at: new Date().toISOString(),
    entries,
    reverse_index: buildReverseIndex(records),
  };
}

/**
 * Diff a freshly built architecture index against a previously-read one.
 * Keyed by `path` (an arc42 section's natural identity — unlike decisions,
 * there's no separate id field). Reuses index-diff.js's generalized
 * entriesEqual — same "sort any array field" comparison serves both doc
 * sets, per docs/process-model.md check 5.
 * @param {{ entries: ArchitectureIndexEntry[] }} computed
 * @param {{ entries: ArchitectureIndexEntry[] }|null} existing
 * @returns {{ stale: boolean, summary: string }}
 */
export function diffArchitectureIndex(computed, existing) {
  if (!existing) {
    const added = computed.entries.map((e) => e.path);
    return {
      stale: true,
      summary:
        added.length > 0
          ? `No existing index found. Would add: ${added.join(', ')}`
          : 'No existing index found.',
    };
  }

  const computedByPath = new Map(computed.entries.map((e) => [e.path, e]));
  const existingByPath = new Map(existing.entries.map((e) => [e.path, e]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [path, entry] of computedByPath) {
    if (!existingByPath.has(path)) {
      added.push(path);
    } else if (!entriesEqual(entry, existingByPath.get(path))) {
      changed.push(path);
    }
  }

  for (const path of existingByPath.keys()) {
    if (!computedByPath.has(path)) removed.push(path);
  }

  const stale = added.length > 0 || removed.length > 0 || changed.length > 0;
  const parts = [];
  if (added.length) parts.push(`Added: ${added.join(', ')}`);
  if (removed.length) parts.push(`Removed: ${removed.join(', ')}`);
  if (changed.length) parts.push(`Changed: ${changed.join(', ')}`);

  return {
    stale,
    summary: stale ? parts.join('; ') : 'Index is up to date.',
  };
}

// --- io wrappers ---

/**
 * Recursively collect all arc42 section .md files under a directory
 * (io wrapper). Excludes `_`-prefixed files (e.g. `_template.md`), matching
 * the same convention lib/commands/index.js's knowledge scanner uses.
 * @param {string} architectureDir - Absolute path to paths.architecture
 * @returns {string[]} Relative paths
 */
export function collectArchitectureFiles(architectureDir) {
  if (!existsSync(architectureDir)) return [];

  const results = [];

  const walk = (dir, basePath) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = basePath ? `${basePath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), relPath);
      } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
        results.push(relPath);
      }
    }
  };

  walk(architectureDir, '');
  return results;
}

/**
 * Determine whether any of a record's key_files have changed since
 * last_verified, via `git log <sha>..HEAD -- <path>` per file. A file with
 * any commit in that range is stale; an unreadable/missing SHA (e.g. a
 * typo, or history that no longer contains it) is treated as stale too,
 * since "can't verify" must never silently read as "verified current".
 *
 * A key_file missing from disk right now is stale unconditionally, checked
 * before the git-log range: a deletion inside the range already surfaces via
 * the git-log check below, but a `last_verified` bumped to (or past) a SHA
 * where the file was already gone would put that deletion outside the range
 * and go undetected by git-log alone — the file simply doesn't exist, which
 * no amount of correct-looking history should be able to paper over.
 * @param {ArchitectureRecord} record
 * @param {string} repoRoot
 * @returns {boolean}
 */
export function isStaleAgainstGit(record, repoRoot) {
  for (const file of record.key_files) {
    if (!existsSync(join(repoRoot, file))) return true;

    try {
      const out = execFileSync(
        'git',
        ['log', '--format=%H', `${record.last_verified}..HEAD`, '--', file],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      if (out.trim().length > 0) return true;
    } catch {
      return true;
    }
  }
  return false;
}

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;
const URI_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Extract relative markdown links from a section's raw content — inline
 * `[text](target)` links whose target is neither an absolute URL (has a
 * URI scheme, e.g. `https://`/`mailto:`) nor a pure same-page anchor
 * (`#foo`). Fenced code blocks are skipped via the shared `nonFencedLines()`
 * helper (`lib/file-utils.js`) — they hold illustrative example syntax, not
 * real links.
 * @param {string} content - Raw file content (frontmatter + body)
 * @returns {{ text: string, target: string }[]}
 */
export function extractRelativeLinks(content) {
  const links = [];

  for (const { line } of nonFencedLines(content)) {
    MD_LINK_RE.lastIndex = 0;
    let m;
    while ((m = MD_LINK_RE.exec(line))) {
      const [, text, rawTarget] = m;
      const target = rawTarget.split(/\s+"/)[0].trim();
      if (!target || target.startsWith('#') || target.startsWith('/')) continue;
      if (URI_SCHEME_RE.test(target)) continue;
      links.push({ text, target });
    }
  }

  return links;
}

/**
 * Read every arc42 section file in a directory (io wrapper). Shared by
 * `findBrokenLinks()` and `buildArchitectureIndexForDir()` — both need every
 * file's raw content, just for a different purpose.
 * @param {string} architectureDir - Absolute path to paths.architecture
 * @returns {{ relPath: string, content: string }[]}
 */
function readArchitectureFiles(architectureDir) {
  return collectArchitectureFiles(architectureDir).map((relPath) => ({
    relPath,
    content: readFileSync(join(architectureDir, relPath), 'utf8'),
  }));
}

/**
 * Find every relative markdown link across an arc42 directory's section
 * files that doesn't resolve to a real file on disk (io wrapper — the only
 * part of link-checking that touches the filesystem beyond reading the
 * files themselves). Each target is resolved relative to its *own* file's
 * directory, not the architecture root, so this stays correct even if a
 * later doc set stops being flat (see collectArchitectureFiles).
 * @param {string} architectureDir - Absolute path to paths.architecture
 * @returns {string[]} One message per broken link
 */
export function findBrokenLinks(architectureDir) {
  const errors = [];

  for (const { relPath, content } of readArchitectureFiles(architectureDir)) {
    for (const { text, target } of extractRelativeLinks(content)) {
      const targetPath = target.split('#')[0];
      if (!targetPath) continue;

      const resolved = join(architectureDir, dirname(relPath), targetPath);
      if (!existsSync(resolved)) {
        errors.push(`${relPath}: link "${text}" -> "${target}" does not resolve`);
      }
    }
  }

  return errors;
}

/**
 * Read, parse, and build the full architecture index for a directory
 * (io wrapper, composes the pure functions above with real git history).
 * @param {string} architectureDir - Absolute path to paths.architecture
 * @param {string} repoRoot - Repo root `key_files` paths and `git log` are relative to
 * @returns {{ generated_at: string, entries: ArchitectureIndexEntry[], reverse_index: Record<string, string[]> }}
 * @throws {Error} When a section file fails to parse
 */
export function buildArchitectureIndexForDir(architectureDir, repoRoot) {
  /** @type {ArchitectureRecord[]} */
  const records = [];

  for (const { relPath, content } of readArchitectureFiles(architectureDir)) {
    const result = parseArchitectureSection(content, relPath);
    if ('error' in result) {
      throw new Error(`Failed to parse architecture section — ${result.error}`);
    }
    records.push(result.record);
  }

  return buildArchitectureIndex(records, (record) => isStaleAgainstGit(record, repoRoot));
}
