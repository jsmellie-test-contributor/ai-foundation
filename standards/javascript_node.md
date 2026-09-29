---
name: javascript_node
version: 1.0.2
description: Node.js runtime conventions for JavaScript projects
tags: [javascript, node]
depends_on: [javascript_base]
---

# Standards: JavaScript Node

Node.js-runtime-specific conventions, layered on `javascript_base`. Grounded in the [Node.js official docs](https://nodejs.org/docs/latest/api/) and the community-maintained [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) list.

This file assumes `javascript_base` is already loaded (per `depends_on`). Language-level conventions — including the file header block, mandatory JSDoc tags, general security items, and formatting/linting rules — are defined there and are not repeated here.

---

## Stack Baseline

| Layer           | Convention                                         |
| --------------- | -------------------------------------------------- |
| Runtime         | Node.js 22+ (LTS)                                  |
| Module system   | ES Modules — `"type": "module"` in `package.json`  |
| Package manager | npm, unless a project standard specifies otherwise |
| Testing         | Node's built-in `node:test` + `node:assert/strict` |

---

## Module Resolution and Imports

### `node:` Protocol Prefix

Always prefix Node built-in modules with `node:`. This avoids ambiguity with same-named npm packages and is the current Node-recommended form.

```javascript
// Correct
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Wrong — ambiguous, no protocol prefix
import { readFileSync } from 'fs';
```

### File Extensions in Import Specifiers

ESM in Node requires explicit file extensions for relative imports. Always include `.js`:

```javascript
// Correct
import { resolveBundle } from './resolver.js';

// Wrong — will fail at runtime under Node ESM resolution
import { resolveBundle } from './resolver';
```

### Import Order

1. `node:*` built-ins
2. External packages (alphabetical)
3. Internal project modules (alphabetical, relative paths)

Blank line between each group:

```javascript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import YAML from 'yaml';

import { SOURCE_DIRS } from './constants.js';
```

---

## File System and Path Handling

- **Always build paths with `node:path`** (`join`, `resolve`) — never string concatenation. This avoids platform separator bugs and path traversal mistakes.
- Prefer the async `node:fs/promises` API for I/O in library and application code.
  Synchronous `fs` calls (`readFileSync`, `existsSync`) are acceptable for startup-time/CLI code that runs once before the event loop is doing real work (matches the pattern already used in this repo's `lib/` code).
- Validate that user- or config-supplied paths stay within an expected base directory before use, if the path could originate from external input.

```javascript
// Correct
import { join } from 'node:path';
const bundlePath = join(repoRoot, 'bundles', bundleName, 'bundle.yaml');

// Wrong — platform-unsafe, no traversal protection
const bundlePath = repoRoot + '/bundles/' + bundleName + '/bundle.yaml';
```

---

## Async I/O and Error Handling

- Use `process.exitCode = 1` (not `process.exit(1)`) in library/CLI logic to let pending I/O flush before the process exits. Reserve `process.exit()` for the top-level entry point only, if needed at all.
- Custom `Error` subclasses that model Node-style failures should carry a `.code` property (matching Node's own convention, e.g. `ENOENT`-style symbolic codes)
  when callers need to branch on failure type:

```javascript
export class BundleNotFoundError extends Error {
  constructor(bundleName, path) {
    super(`Bundle not found: ${bundleName} (looked at ${path})`);
    this.name = 'BundleNotFoundError';
    this.code = 'BUNDLE_NOT_FOUND';
  }
}
```

---

## Project Structure

Standard layout for a Node package or CLI project:

```
{project-name}/
├── bin/                  ← Executable entry points (shebang scripts)
├── lib/                  ← Library code
│   ├── {module}.js
│   └── {module}.test.js  ← Colocated test file
├── commands/             ← CLI subcommand implementations, if applicable
├── package.json
└── README.md
```

- **Tests are colocated** with the code they test, named `{module}.test.js` (matches this repo's existing pattern), unless a project standard specifies a separate `test/` tree.
- **Pure logic separate from I/O.** Functions that parse, validate, or transform data should not perform file/network I/O directly — pass data in, return data out, and let a thin wrapper function handle I/O. This enables fast unit tests without mocking the filesystem (see `steering/engineering/core.md`: "Design for Testability").

---

## CLI Conventions

- Executable scripts start with a shebang: `#!/usr/bin/env node`
- Keep `bin/*.js` entry points thin — parse args, then delegate to `lib/`/`commands/` functions that contain the actual logic (testable without spawning a process).
- Print user-facing errors to `stderr` (`console.error`), not `stdout`.

---

## Logging Requirements

- CLI tools and scripts: `console.log`/`console.error` is acceptable — output _is_ the product.
- Long-running services or servers: use structured logging (e.g. a library such as Pino) instead of `console.*`, so log output is machine-parseable and includes consistent metadata (timestamp, level, context).
- Never log secrets, tokens, or full file contents that may contain sensitive data.
- Log level guide:

| Level | When to use                                               |
| ----- | --------------------------------------------------------- |
| debug | Verbose internal state, useful only when troubleshooting  |
| info  | Normal operational milestones (started, completed, saved) |
| warn  | Recoverable but unexpected conditions                     |
| error | Operation failed, action could not complete               |

---

## Security Requirements

Node-specific items — combine with `javascript_base`'s general Security Requirements to form the full checklist for every JS/Node plan:

- [ ] File paths built with `node:path` (`join`/`resolve`) — never string concatenation
- [ ] Paths derived from external/user input are validated to stay within an expected base directory before use
- [ ] `child_process` calls use array-form arguments (`execFile`/`spawn` with an args array), never a single interpolated shell string, when the input touches external data
- [ ] Secrets/tokens are read from environment variables or a secret store, never hardcoded
- [ ] Dependencies are pinned (exact versions or lockfile committed) — no floating version ranges for security-sensitive packages

---

## Testing Requirements

Framework: Node's built-in `node:test` + `node:assert/strict` (matches this repo's existing pattern). Alternatives such as Jest or Vitest are acceptable if a project standard explicitly overrides this.

### Test File Structure

Colocated with the module under test:

```
lib/
├── resolver.js
└── resolver.test.js
```

### Test Naming Convention

Use `describe`/`it` blocks; describe names the unit under test, `it` names the scenario and expected behavior in plain language:

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSkillRef } from './resolver.js';

describe('parseSkillRef', () => {
  it('strips the skill/ prefix', () => {
    assert.equal(parseSkillRef('skill/plan-lifecycle'), 'plan-lifecycle');
  });

  it('returns null for an empty string', () => {
    assert.equal(parseSkillRef(''), null);
  });
});
```

### Minimum Coverage Rule

Every exported function must have:

- At least one happy-path test
- At least one test for each documented failure condition (thrown errors, null returns, etc.)
- At least one empty/missing-input test if the function accepts strings, arrays, or objects

---

## Linting and Formatting Tooling

Defined in `javascript_base` and applies unchanged here — no Node-specific additions.
