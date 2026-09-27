/**
 * validate command — checks repo health: schemas, cross-references, bundle resolution.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

import { SOURCE_DIRS } from '../constants.js';
import { resolveBundle, listBundles } from '../resolver.js';
import { nonFencedLines } from '../file-utils.js';

const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?(\+[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$/;

/**
 * Run the validate command.
 * @param {{ args: Record<string, string|boolean>, positional: string[] }} parsed
 * @param {string} repoRoot
 * @returns {number} exit code
 */
export function runValidate(parsed, repoRoot) {
  const target = parsed.positional[0];
  const checks = {
    schema: validateSchemas,
    refs: validateRefs,
    bundles: validateBundles,
  };

  if (target && !checks[target]) {
    console.error(`Unknown validate target: ${target}. Use: schema, refs, bundles`);
    return 1;
  }

  const toRun = target ? { [target]: checks[target] } : checks;
  let totalErrors = 0;

  for (const [name, fn] of Object.entries(toRun)) {
    const errors = fn(repoRoot);
    if (errors.length === 0) {
      console.log(`✓ ${name}`);
    } else {
      console.log(`✗ ${name} (${errors.length} errors)`);
      for (const err of errors) {
        console.log(`    ${err}`);
      }
      totalErrors += errors.length;
    }
  }

  if (totalErrors > 0) {
    console.log(`\n${totalErrors} validation error(s) found.`);
    return 1;
  }

  console.log('\nAll validations passed.');
  return 0;
}

// --- Schema validation ---

function validateSchemas(repoRoot) {
  const errors = [];
  errors.push(...validateAgentSchemas(repoRoot));
  errors.push(...validateSkillSchemas(repoRoot));
  errors.push(...validateSteeringSchemas(repoRoot));
  errors.push(...validateBundleSchemas(repoRoot));
  return errors;
}

function validateAgentSchemas(repoRoot) {
  const errors = [];
  const dir = join(repoRoot, SOURCE_DIRS.agents);
  if (!existsSync(dir)) return errors;

  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
  for (const file of files) {
    const path = join(dir, file);
    const agent = parseYaml(path);
    if (!agent) {
      errors.push(`${file}: invalid YAML`);
      continue;
    }

    const name = file.replace(/\.yaml$/, '');
    if (!agent.name) errors.push(`${file}: missing 'name'`);
    else if (agent.name !== name)
      errors.push(`${file}: name '${agent.name}' doesn't match filename`);
    else if (!KEBAB_CASE.test(agent.name)) errors.push(`${file}: name is not kebab-case`);

    if (!agent.version) errors.push(`${file}: missing 'version'`);
    else if (!SEMVER.test(agent.version)) errors.push(`${file}: invalid semver '${agent.version}'`);

    if (!agent.domain) errors.push(`${file}: missing 'domain'`);
    if (!agent.description) errors.push(`${file}: missing 'description'`);
    if (!agent.prompt) errors.push(`${file}: missing 'prompt'`);
    if (!Array.isArray(agent.tools)) errors.push(`${file}: missing or invalid 'tools'`);
    if (!Array.isArray(agent.approved_tools))
      errors.push(`${file}: missing or invalid 'approved_tools'`);

    if (Array.isArray(agent.tools) && Array.isArray(agent.approved_tools)) {
      for (const tool of agent.approved_tools) {
        if (!agent.tools.includes(tool)) {
          errors.push(`${file}: approved_tool '${tool}' not in tools`);
        }
      }
    }
  }
  return errors;
}

function validateSkillSchemas(repoRoot) {
  const errors = [];
  const dir = join(repoRoot, SOURCE_DIRS.skills);
  if (!existsSync(dir)) return errors;

  const folders = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name);

  for (const folder of folders) {
    const skillPath = join(dir, folder, 'SKILL.md');
    if (!existsSync(skillPath)) {
      errors.push(`skills/${folder}: missing SKILL.md`);
      continue;
    }

    const content = readFileSync(skillPath, 'utf8');
    const fm = extractFrontmatter(content);
    if (!fm) {
      errors.push(`skills/${folder}/SKILL.md: missing or invalid frontmatter`);
      continue;
    }

    if (!fm.name) errors.push(`skills/${folder}/SKILL.md: missing 'name'`);
    else if (fm.name !== folder)
      errors.push(`skills/${folder}/SKILL.md: name '${fm.name}' doesn't match folder`);
    else if (!KEBAB_CASE.test(fm.name))
      errors.push(`skills/${folder}/SKILL.md: name is not kebab-case`);

    if (!fm.version) errors.push(`skills/${folder}/SKILL.md: missing 'version'`);
    else if (!SEMVER.test(fm.version)) errors.push(`skills/${folder}/SKILL.md: invalid semver`);

    if (!fm.description) errors.push(`skills/${folder}/SKILL.md: missing 'description'`);
  }
  return errors;
}

function validateSteeringSchemas(repoRoot) {
  const errors = [];
  const dir = join(repoRoot, SOURCE_DIRS.steering);
  if (!existsSync(dir)) return errors;

  const files = collectMdFilesFlat(dir);
  for (const relPath of files) {
    const fullPath = join(dir, relPath);
    const content = readFileSync(fullPath, 'utf8');
    const fm = extractFrontmatter(content);
    if (!fm) {
      errors.push(`steering/${relPath}: missing or invalid frontmatter`);
      continue;
    }

    if (!fm.name) errors.push(`steering/${relPath}: missing 'name'`);
    else if (!KEBAB_CASE.test(fm.name)) errors.push(`steering/${relPath}: name is not kebab-case`);

    if (!fm.version) errors.push(`steering/${relPath}: missing 'version'`);
    else if (!SEMVER.test(fm.version)) errors.push(`steering/${relPath}: invalid semver`);

    if (!fm.description) errors.push(`steering/${relPath}: missing 'description'`);
  }
  return errors;
}

function validateBundleSchemas(repoRoot) {
  const errors = [];
  const dir = join(repoRoot, SOURCE_DIRS.bundles);
  if (!existsSync(dir)) return errors;

  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
  for (const file of files) {
    const path = join(dir, file);
    const bundle = parseYaml(path);
    if (!bundle) {
      errors.push(`bundles/${file}: invalid YAML`);
      continue;
    }

    if (!bundle.name) errors.push(`bundles/${file}: missing 'name'`);
    if (!bundle.version) errors.push(`bundles/${file}: missing 'version'`);
    else if (!SEMVER.test(bundle.version)) errors.push(`bundles/${file}: invalid semver`);
    if (!bundle.description) errors.push(`bundles/${file}: missing 'description'`);
  }
  return errors;
}

// --- Cross-reference validation ---

function validateRefs(repoRoot) {
  const errors = [];
  const agentsDir = join(repoRoot, SOURCE_DIRS.agents);
  if (existsSync(agentsDir)) {
    const files = readdirSync(agentsDir).filter((f) => f.endsWith('.yaml') && !f.startsWith('_'));
    for (const file of files) {
      const agent = parseYaml(join(agentsDir, file));
      if (!agent) continue;

      // Check skills exist
      if (Array.isArray(agent.skills)) {
        for (const ref of agent.skills) {
          const name = ref.startsWith('skill/') ? ref.slice('skill/'.length) : ref;
          const skillDir = join(repoRoot, SOURCE_DIRS.skills, name);
          if (!existsSync(skillDir)) {
            errors.push(`${file}: skill '${ref}' references non-existent folder skills/${name}/`);
          }
        }
      }

      // Check domain has steering
      if (agent.domain) {
        const domainDir = join(repoRoot, SOURCE_DIRS.steering, agent.domain);
        if (!existsSync(domainDir)) {
          errors.push(
            `${file}: domain '${agent.domain}' has no matching steering/${agent.domain}/ directory`,
          );
        }
      }
    }
  }

  errors.push(...validateCitations(repoRoot));
  return errors;
}

// --- Inline named-locator citation validation ---
//
// A prose reference to *a whole component* is just `skill/{name}` or
// `steering/{path}.md`. A reference to a *specific numbered locator inside*
// that component (a skill's Step, a steering file's Rule) must additionally
// name that locator exactly, e.g.:
//
//   `skill/worktree-management`: "Create Worktree"
//   `skill/worktree-management`: "Resolve Worktree Path" → "Create Worktree" → "Setup Worktree"
//   `steering/engineering/core.md`: "Cite, Don't Restate"
//
// Citing a locator by ordinal only (`skill/x Step 3`, `core.md Rule 10`) is
// what this check forbids — the number silently drifts when the target's
// locators are reordered, inserted, or removed, leaving the reference
// pointing at a different locator (or none) without anyone noticing.
// See steering/engineering/core.md Rule 10.

const QUOTE_CHAIN_RE = /^("(?:[^"]*)"(?:\s*(?:→|->)\s*"(?:[^"]*)")*)/;
// Kept short deliberately: this is a same-line proximity heuristic, not a
// parser, so a wide window starts matching an unrelated "Step N"/"Rule N"
// mentioned later in a long prose line. False negatives here are safe (the
// citation still gets caught by manual review / Rule 10); false positives
// are not, since this check hard-fails `aif validate refs`.
const ORDINAL_WINDOW = 40;

// One entry per component family that has numbered internal locators worth
// citing by name. Add a new entry here to extend this check to another
// component type rather than writing a parallel checker.
const CITATION_FAMILIES = [
  {
    // `skill/{name}` → skills/{name}/SKILL.md's `### Step N — Name` headings
    refRe: /skill\/([a-z][a-z0-9-]*)/g,
    headingRe: /^###\s*Step\s+\d+[a-zA-Z]?\s*(?:\([^)]*\)\s*)?[—–-]\s*(.+?)\s*$/gm,
    headingLineRe: /^\s*###\s*Step\s+\d/,
    ordinalRe: /\bStep[s]?\s+\d+\b/,
    ordinalLabel: 'step',
    resolveTarget: (repoRoot, ref) => join(repoRoot, SOURCE_DIRS.skills, ref, 'SKILL.md'),
    describeTarget: (ref) => `skills/${ref}/SKILL.md`,
    formatRef: (ref) => `skill/${ref}`,
    // Reject matches that are really part of a longer slash-separated word
    // list (e.g. "Agent/skill/steering/schema"), not a path reference.
    isBoundary: (line, matchEnd) => line[matchEnd] !== '/',
  },
  {
    // `steering/{path}.md` → that file's `### Rule: Name` headings.
    // Deliberately unnumbered (unlike skill Steps): rules are independent,
    // unordered constraints, so a number would carry no real meaning — only
    // a drift risk. If a citation could ever reference "Rule 10" and still
    // pass after Rule 10 became a different rule entirely, the number was
    // the bug. Removing it from the heading removes the possibility.
    refRe: /steering\/[a-z0-9/_.-]+\.md/g,
    headingRe: /^###\s*Rule:\s*(.+?)\s*$/gm,
    headingLineRe: /^\s*###\s*Rule:/,
    ordinalRe: /\bRule[s]?\s+\d+\b/,
    ordinalLabel: 'rule',
    resolveTarget: (repoRoot, ref) => join(repoRoot, ref),
    describeTarget: (ref) => ref,
    formatRef: (ref) => ref,
    isBoundary: () => true,
  },
];

export function validateCitations(repoRoot) {
  const errors = [];
  const headingsCache = new Map();

  function getHeadings(family, ref) {
    const cacheKey = `${family.ordinalLabel}:${ref}`;
    if (headingsCache.has(cacheKey)) return headingsCache.get(cacheKey);
    const targetPath = family.resolveTarget(repoRoot, ref);
    if (!existsSync(targetPath)) {
      headingsCache.set(cacheKey, null);
      return null;
    }
    const content = readFileSync(targetPath, 'utf8');
    const headings = [];
    let m;
    family.headingRe.lastIndex = 0;
    while ((m = family.headingRe.exec(content))) headings.push(m[1].trim());
    headingsCache.set(cacheKey, headings);
    return headings;
  }

  // Include README.md here (unlike the schema-validation targets above,
  // which skip it — READMEs have no frontmatter to validate) since these
  // are exactly the human-facing docs someone reads for a component's
  // convention and where a citation drifting matters just as much.
  const readmeOpts = { includeReadme: true };
  const targets = [
    ...collectFilesFlat(
      join(repoRoot, SOURCE_DIRS.skills),
      ['.md', '.yaml'],
      SOURCE_DIRS.skills,
      readmeOpts,
    ),
    ...collectFilesFlat(
      join(repoRoot, SOURCE_DIRS.agents),
      ['.yaml', '.md'],
      SOURCE_DIRS.agents,
      readmeOpts,
    ),
    ...collectFilesFlat(
      join(repoRoot, SOURCE_DIRS.steering),
      ['.md'],
      SOURCE_DIRS.steering,
      readmeOpts,
    ),
    ...collectFilesFlat(
      join(repoRoot, SOURCE_DIRS.servers),
      ['.md'],
      SOURCE_DIRS.servers,
      readmeOpts,
    ),
    ...collectFilesFlat(
      join(repoRoot, SOURCE_DIRS.standards),
      ['.md'],
      SOURCE_DIRS.standards,
      readmeOpts,
    ),
    ...['AGENTS.md', 'README.md'].filter((f) => existsSync(join(repoRoot, f))),
  ];

  for (const relPath of targets) {
    const fullPath = join(repoRoot, relPath);
    const content = readFileSync(fullPath, 'utf8');

    // Fenced code blocks (```...```) hold illustrative example syntax, not
    // real citations — don't scan inside them.
    for (const { line, lineNumber } of nonFencedLines(content)) {
      const loc = `${relPath}:${lineNumber}`;

      for (const family of CITATION_FAMILIES) {
        // Don't flag the locator-heading definitions themselves.
        if (family.headingLineRe.test(line)) continue;

        family.refRe.lastIndex = 0;
        let ref;
        while ((ref = family.refRe.exec(line))) {
          const target = ref[1] !== undefined ? ref[1] : ref[0];
          const matchEnd = ref.index + ref[0].length;
          if (!family.isBoundary(line, matchEnd)) continue;

          const headings = getHeadings(family, target);
          if (headings === null) {
            errors.push(`${loc}: cites non-existent ${family.formatRef(target)}`);
            continue;
          }

          let after = line.slice(matchEnd);
          if (after.startsWith('`')) after = after.slice(1);
          after = after.replace(/^\s*/, '');
          if (after.startsWith(':')) after = after.slice(1).replace(/^\s*/, '');

          const chainMatch = after.match(QUOTE_CHAIN_RE);
          if (chainMatch) {
            const quoted = [...chainMatch[1].matchAll(/"([^"]*)"/g)].map((m) => m[1].trim());
            for (const name of quoted) {
              const found = headings.some(
                (h) => h === name || h.includes(name) || name.includes(h),
              );
              if (!found) {
                errors.push(
                  `${loc}: cites '${family.formatRef(target)}: "${name}"' but ${family.describeTarget(target)} has no matching heading (drifted — update the citation or the heading name)`,
                );
              }
            }
            continue;
          }

          // No quoted locator name — flag if this looks like a raw ordinal
          // citation rather than a plain whole-component reference.
          const window = after.slice(0, ORDINAL_WINDOW);
          if (family.ordinalRe.test(window)) {
            errors.push(
              `${loc}: raw ${family.ordinalLabel}-ordinal citation near '${family.formatRef(target)}' — cite it by name instead of number, e.g. \`${family.formatRef(target)}\`: "Heading Text" (see steering/engineering/core.md Rule 10)`,
            );
          }
        }
      }
    }
  }

  return errors;
}

// --- Bundle resolution validation ---

function validateBundles(repoRoot) {
  const errors = [];
  const bundles = listBundles(repoRoot);

  for (const name of bundles) {
    try {
      resolveBundle(name, repoRoot);
    } catch (err) {
      errors.push(`bundles/${name}/bundle.yaml: ${err.message}`);
    }
  }
  return errors;
}

// --- Helpers ---

function parseYaml(filePath) {
  try {
    return YAML.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function extractFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return YAML.parse(match[1]);
  } catch {
    return null;
  }
}

function collectMdFilesFlat(dir, prefix = '') {
  return collectFilesFlat(dir, ['.md'], prefix);
}

function collectFilesFlat(dir, extensions, prefix = '', { includeReadme = false } = {}) {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;
    if (entry.name === 'README.md' && !includeReadme) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectFilesFlat(join(dir, entry.name), extensions, rel, { includeReadme }));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(rel);
    }
  }
  return results;
}
