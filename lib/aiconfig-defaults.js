/**
 * Default values for .aiconfig.json fields — the code-owned source of truth
 * for the "Defaults (when .aiconfig.json is absent)" table in AGENTS.md.
 * AGENTS.md's prose table must stay in sync with this file, not the other
 * way around: this is what lib/aiconfig.js actually resolves against.
 *
 * Keys are dotted field paths matching .aiconfig.json's own shape (e.g.
 * "paths.decisions"), matching how AGENTS.md's field table already names
 * them.
 *
 * A default is either a literal value, or a function `(ctx) => value` for
 * fields whose default derives from another field's *resolved* value
 * rather than a fixed constant.
 */

import { basename } from 'node:path';

/**
 * @typedef {object} DefaultCtx
 * @property {string} projectRoot - Absolute path to the project repo root.
 * @property {(keyPath: string) => *} get - Resolve another field's value
 *   (its configured value if set, else its own default). Used to express
 *   defaults that derive from another field.
 */

/**
 * A default for a `paths.*` field that nests under another `paths.*`
 * field's *resolved* value, e.g. paths.decisions defaulting to
 * "{resolved paths.knowledge}/decisions". A configured override of the
 * parent path (paths.knowledge) shifts this default with it, rather than
 * leaving it pinned to the parent's own hardcoded default — the same
 * relationship AGENTS.md's table already implies for every nested path
 * below (epics/chunks/orchestration under plans, decisions under
 * knowledge), just expressed once instead of duplicated per field.
 * @param {string} parentKeyPath - Dotted key of the parent field, e.g. "paths.plans"
 * @param {string} subPath - Path segment appended under the parent, e.g. "epics"
 * @returns {(ctx: DefaultCtx) => string}
 */
function nestedUnder(parentKeyPath, subPath) {
  return (ctx) => `${ctx.get(parentKeyPath)}/${subPath}`;
}

export const DEFAULTS = {
  project_name: (ctx) => basename(ctx.projectRoot),
  project_shortname: (ctx) => ctx.get('project_name'),
  repo_type: 'project',

  'paths.plans': 'plans',
  'paths.features': nestedUnder('paths.plans', 'features'),
  'paths.knowledge': 'knowledge',
  'paths.decisions': nestedUnder('paths.knowledge', 'decisions'),
  'paths.architecture': nestedUnder('paths.knowledge', 'architecture'),
  'paths.research': nestedUnder('paths.knowledge', 'research'),
  'paths.worktrees': (ctx) => `../worktrees/${ctx.get('project_shortname')}`,

  'orchestration.max_concurrent': 4,
};
