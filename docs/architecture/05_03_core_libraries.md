---
section: '05.03'
title: 'Core libraries'
lifecycle: published
last_verified: 5944c97
tags: [building-blocks, core-libraries]
key_files:
  - lib/manifest.js
  - lib/snapshot/io.js
  - lib/snapshot/pure.js
  - lib/project-init.js
  - lib/ai-git.js
  - lib/secrets.js
  - lib/constants.js
  - lib/component-defs.js
  - lib/aiconfig.js
  - lib/aiconfig-resolve.js
  - lib/aiconfig-defaults.js
  - lib/file-utils.js
---

> `lib/*.js`'s harness-agnostic support libraries, excluding `resolver.js`
> (§5.01), `lib/harnesses/*` (§5.02), and the decisions/architecture indexing
> pair (§5.04) — manifest tracking, snapshot diffing, project scaffolding, and
> shared constants that every command reuses.

## Motivation

The largest heterogeneous group in §5's "Core libraries" row: 12 files across 8
unrelated responsibilities, and the group most likely to gain a new file as the
CLI grows. Its own `key_files` list keeps the top-level §5 doc's list short
enough that a rename or deletion there stays a meaningful signal, while these
12 files' individual freshness stays tracked here instead of silently dropping
out of `aif index architecture --check` coverage. `file-utils.js`'s addition
(splitting generic file/hash/frontmatter helpers out of `lib/harnesses/base.js`
— see §5.02's Consumers section) and `secrets.js`'s addition (provider-agnostic
secrets resolution for `ai-git`, per `docs/plans/secrets-resolution-plan.md`)
are exactly the split-trigger case `steering/engineering/architecture-authoring.md`
names past 5 entries; a finer `05.0x` subsection isn't warranted yet, since these
8 responsibilities still share nothing beyond "not `resolver.js`/harnesses/indexing"
the way §5.01's or §5.04's content does.

## Contained Building Blocks

| Block                                                          | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Interface                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `manifest.js`                                                  | Tracks every file `aif install` writes, per bundle/server/hook, in `.installs.yaml` — what `uninstall` reads to know what to remove.                                                                                                                                                                                                                                                                                                                                                               | `readManifest()`/`writeManifest()`, `get/set/removeEntry()`                                                      |
| `snapshot/io.js` + `snapshot/pure.js`                          | Builds and diffs source-file-hash snapshots per bundle/server/hook to detect drift between installed output and current source.                                                                                                                                                                                                                                                                                                                                                                    | `buildSnapshot()`, `diffSnapshot()`, `isFreshnessCurrent()`                                                      |
| `project-init.js`                                              | Validates project name/shortname, generates `.aiconfig.json` content, applies template placeholder substitution.                                                                                                                                                                                                                                                                                                                                                                                   | `buildAiConfig()`, `applyProjectConfig()`                                                                        |
| `ai-git.js`                                                    | Pure logic behind the `ai-git` CLI: identity resolution, env injection, gh-command detection and auth-arg construction.                                                                                                                                                                                                                                                                                                                                                                            | `getIdentity()`, `buildGitEnv()`, `buildGhEnv()`                                                                 |
| `secrets.js`                                                   | Pure logic behind provider-agnostic secrets resolution for `ai-git`: reads `secrets.run`/`secrets.allow_insecure_dotenv` out of a parsed `.aiconfig.json`, resolves `${VAR}` placeholders, parses `.env`-format text, and builds a re-exec-through-wrapper invocation. Never resolves a secret value itself — that's the wrapper command's job.                                                                                                                                                    | `getSecretsConfig()`, `resolvePlaceholders()`, `parseDotenv()`, `buildWrapperInvocation()`, `isAlreadyWrapped()` |
| `constants.js` / `component-defs.js`                           | Shared constants (canonical tool names, source directories, CLI command list) and JSDoc-only `AgentDef`/`ServerDef` type shapes — no runtime behavior, just a single owner for both.                                                                                                                                                                                                                                                                                                               | `TOOLS`, `SOURCE_DIRS`, `COMMANDS`                                                                               |
| `aiconfig.js` / `aiconfig-resolve.js` / `aiconfig-defaults.js` | Resolves a `.aiconfig.json` field to its configured value or documented default, without ever writing a default back to disk. `aiconfig-defaults.js` owns the default table (some entries derive from another field's resolved value, e.g. `paths.decisions` nesting under `paths.knowledge`); `aiconfig-resolve.js` is the pure merge logic against a plain object; `aiconfig.js` is the I/O layer that reads `.aiconfig.json` off disk and also finds a project root by walking up for the file. | `getConfigValue()`, `getConfigPath()`, `findProjectRoot()`, `resolveConfigValue()`                               |
| `file-utils.js`                                                | Generic file/hash/frontmatter helpers with no harness-specific behavior: YAML frontmatter parsing, recursive file collection, SHA-256 content hashing, writing to a target path, and line-oriented scanning that skips fenced code blocks.                                                                                                                                                                                                                                                         | `parseFrontmatter()`, `collectFiles()`, `hashContent()`, `writeToTarget()`, `nonFencedLines()`                   |

## Consumers

`lib/commands/*` is the primary caller of each library above — `install.js`/
`uninstall.js` use `manifest.js`; `snapshot.js` uses `snapshot/io.js`; `init.js`
uses `project-init.js`; `index.js` uses `aiconfig.js` for path resolution (see
§5.04 for `decisions.js`/`architecture.js` themselves); `config.js` uses
`aiconfig.js` directly. `bin/ai-git.js` is the sole caller of both `ai-git.js`
and `secrets.js` — it resolves secrets only before a git/gh operation that
actually needs the push/auth token, never for read-only operations like
`commit`/`status`/`log` (§5 Entry points).
`constants.js` is imported across nearly every module in `lib/` and
`lib/commands/` (10 of 11 files); `component-defs.js` is much narrower — its
JSDoc-only types are referenced (via `@param {import('./component-defs.js').X}`
comments, never a runtime `import`) only by the three `lib/harnesses/*` files,
not repo-wide. `file-utils.js` has the widest reach of any block in this
table: `lib/harnesses/base.js`/`claude.js`/`kiro.js` (§5.02), `snapshot/io.js`
(this table), `lib/decisions.js`/`architecture.js` (§5.04), and `lib/commands/validate.js`'s citation checker (§5.05) all import from it directly — `nonFencedLines()` specifically is shared by `architecture.js`'s relative-link extractor and `validate.js`'s citation checker, the one piece of logic those two otherwise-unrelated checks would each have hand-rolled separately.
