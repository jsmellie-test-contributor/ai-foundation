// ------------------------------
// decisions.js
//
// Author: Starvoxel AI Agent - 2026-08-19
// Plan: AIF-002-014, AIF-003-001, docs/process-model.md check 30
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * ADR (MADR) metadata parsing, index building, and diffing for the
 * `aif index decisions` command (lib/commands/index.js).
 *
 * Pure logic (parsing, inversion, diffing) is exported with no I/O so it can
 * be unit tested against synthetic in-memory fixtures. The io wrapper
 * functions at the bottom of this file (collectDecisionFiles,
 * buildDecisionIndexForDir) compose the pure functions with real filesystem
 * access, mirroring the lib/snapshot/{pure,io}.js split.
 *
 * Retargeted at check 30 from the old `## Metadata` table format to MADR
 * frontmatter — see docs/process-model.md's "ADR format — MADR" and "ADR
 * discovery" sections. `docs/decisions/archive/` (retired, non-MADR records
 * kept as historical reference, per check 27) is intentionally not scanned:
 * the live corpus is a flat directory now, so archived records simply live
 * outside it rather than needing an exclusion rule.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { parseFrontmatter } from './file-utils.js';
import { entriesEqual } from './index-diff.js';

const REQUIRED_FIELDS = ['status'];
const ID_PATTERN = /^(\d{4})-/;
const TITLE_PATTERN = /^# (.+)$/m;

/**
 * @typedef {object} DecisionRecord
 * @property {string} id
 * @property {string} title
 * @property {string} status
 * @property {string|null} date
 * @property {string} path
 * @property {string[]} decisionMakers
 * @property {string[]} tags
 * @property {string[]} supersedes
 * @property {string[]} affects
 */

/**
 * @typedef {object} DecisionIndexEntry
 * @property {string} id
 * @property {string} title
 * @property {string} status
 * @property {string|null} date
 * @property {string} path
 * @property {string[]} decision_makers
 * @property {string[]} tags
 * @property {string[]} supersedes
 * @property {string[]} superseded_by
 * @property {string[]} affects
 */

/**
 * Extract the plain `# {title}` H1 — MADR's title lives in the body, not
 * frontmatter.
 * @param {string} body - Content after the frontmatter block
 * @returns {string} '' if no H1 is found
 */
function extractTitle(body) {
  const match = body.match(TITLE_PATTERN);
  return match ? match[1].trim() : '';
}

/**
 * Parse an ADR file's frontmatter + title into a structured record. The ID
 * is the filename's own zero-padded number (MADR's convention — no `id`
 * frontmatter field), not a value read out of the file's content.
 * @param {string} content - Raw file content
 * @param {string} relPath - Path relative to paths.decisions
 * @returns {{ record: DecisionRecord } | { error: string }}
 */
export function parseDecisionRecord(content, relPath) {
  const idMatch = relPath.match(ID_PATTERN);
  if (!idMatch) {
    return {
      error: `${relPath}: filename must start with a zero-padded number, e.g. "0007-slug.md"`,
    };
  }

  const { frontmatter, body } = parseFrontmatter(content);
  if (!frontmatter) {
    return { error: `${relPath}: missing YAML frontmatter` };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter[field]) {
      return { error: `${relPath}: missing required frontmatter field "${field}"` };
    }
  }

  const title = extractTitle(body);
  if (!title) {
    return { error: `${relPath}: missing "# {title}" heading` };
  }

  return {
    record: {
      id: idMatch[1],
      title,
      status: frontmatter.status,
      date: frontmatter.date ? String(frontmatter.date) : null,
      path: relPath,
      decisionMakers: Array.isArray(frontmatter['decision-makers'])
        ? frontmatter['decision-makers']
        : [],
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      supersedes: Array.isArray(frontmatter.links?.supersedes)
        ? frontmatter.links.supersedes.map(String)
        : [],
      affects: Array.isArray(frontmatter.affects) ? frontmatter.affects : [],
    },
  };
}

/**
 * Compute superseded_by for every record by inverting `supersedes` across
 * the whole set, and assemble the final index.json structure. `superseded_by`
 * is the only computed reverse edge — `links.related`/`links.amends` are
 * reserved frontmatter fields, not yet populated by anything, so there is
 * nothing to invert for them yet.
 * @param {DecisionRecord[]} records - Parsed records (from parseDecisionRecord)
 * @returns {{ generated_at: string, entries: DecisionIndexEntry[] }}
 */
export function buildDecisionIndex(records) {
  const entries = records.map((record) => ({
    id: record.id,
    title: record.title,
    status: record.status,
    date: record.date ?? null,
    path: record.path,
    decision_makers: record.decisionMakers || [],
    tags: record.tags || [],
    supersedes: record.supersedes || [],
    superseded_by: [],
    affects: record.affects || [],
  }));

  for (const entry of entries) {
    entry.superseded_by = entries
      .filter((other) => other.id !== entry.id && other.supersedes.includes(entry.id))
      .map((other) => other.id);
  }

  return {
    generated_at: new Date().toISOString(),
    entries,
  };
}

/**
 * Diff a freshly built index against a previously-read one.
 * @param {{ entries: DecisionIndexEntry[] }} computed
 * @param {{ entries: DecisionIndexEntry[] }|null} existing
 * @returns {{ stale: boolean, summary: string }}
 */
export function diffDecisionIndex(computed, existing) {
  if (!existing) {
    const added = computed.entries.map((e) => e.id);
    return {
      stale: true,
      summary:
        added.length > 0
          ? `No existing index found. Would add: ${added.join(', ')}`
          : 'No existing index found.',
    };
  }

  const computedById = new Map(computed.entries.map((e) => [e.id, e]));
  const existingById = new Map(existing.entries.map((e) => [e.id, e]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, entry] of computedById) {
    if (!existingById.has(id)) {
      added.push(id);
    } else if (!entriesEqual(entry, existingById.get(id))) {
      changed.push(id);
    }
  }

  for (const id of existingById.keys()) {
    if (!computedById.has(id)) removed.push(id);
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
 * Collect every ADR file directly under a directory (io wrapper) — flat, no
 * recursion. MADR's own convention (`docs/process-model.md`'s "ADR discovery"
 * section): one flat counter, no subfolders, filenames start with a
 * zero-padded number. `_`-prefixed files (`_template.md`) are excluded, the
 * same convention used elsewhere in this repo for template scaffolding.
 * @param {string} decisionsDir - Absolute path to paths.decisions
 * @returns {string[]} Relative paths (bare filenames, since this is flat)
 */
export function collectDecisionFiles(decisionsDir) {
  if (!existsSync(decisionsDir)) return [];

  return readdirSync(decisionsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith('_') && ID_PATTERN.test(name));
}

/**
 * Read, parse, and build the full index for a directory (io wrapper,
 * composes the pure functions above). Throws with a clear message naming
 * the offending file on any parse failure.
 * @param {string} decisionsDir - Absolute path to paths.decisions
 * @returns {{ generated_at: string, entries: DecisionIndexEntry[] }}
 * @throws {Error} When an ADR file fails to parse
 */
export function buildDecisionIndexForDir(decisionsDir) {
  const files = collectDecisionFiles(decisionsDir);
  /** @type {DecisionRecord[]} */
  const records = [];

  for (const relPath of files) {
    const content = readFileSync(join(decisionsDir, relPath), 'utf8');
    const result = parseDecisionRecord(content, relPath);
    if ('error' in result) {
      throw new Error(`Failed to parse decision record — ${result.error}`);
    }
    records.push(result.record);
  }

  return buildDecisionIndex(records);
}
