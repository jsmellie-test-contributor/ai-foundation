---
name: javascript_base
version: 1.0.2
description: Core JavaScript language conventions for all JS projects
tags: [javascript]
depends_on: []
---

# Standards: JavaScript Base

Runtime-agnostic language conventions. Applies to any JavaScript code regardless of where it executes (Node, browser, edge runtime, etc.), and is complete and usable on its own. Runtime-specific rules (module resolution mechanics, I/O, testing framework, project layout) live in a separate runtime layer that depends on this file — e.g. `javascript_node` for Node.js.

Style basis: this standard follows the widely-adopted [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) for the rules below, adapted where noted. If a project's existing code conflicts with a rule here, raise it for discussion rather than silently reformatting.

---

## Language Baseline

| Aspect           | Convention                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Language version | Modern ECMAScript (ES2022+) — no transpilation assumed unless a project standard says otherwise |
| Module system    | ES Modules (`import`/`export`) — see `javascript_node` for runtime resolution details           |
| Type system      | Plain JavaScript. See `typescript_base` (future) for typed projects                             |

---

## Variable Declarations

- **Never use `var`.** Use `const` by default; use `let` only when a binding is reassigned.
- Declare one variable per statement.

```javascript
// Correct
const maxRetries = 3;
let attempt = 0;

// Wrong
var maxRetries = 3;
```

---

## Naming Conventions

| Construct                                | Convention                 | Example                  |
| ---------------------------------------- | -------------------------- | ------------------------ |
| Variables, functions                     | camelCase                  | `parseFile`, `userCount` |
| Classes                                  | PascalCase                 | `DataParser`             |
| Private class fields                     | `#camelCase`               | `#retryCount`            |
| Constants (module-level, true constants) | UPPER_SNAKE_CASE           | `MAX_RETRY_COUNT`        |
| Constants (local, non-primitive config)  | camelCase                  | `defaultOptions`         |
| File names                               | kebab-case                 | `data-parser.js`         |
| Boolean variables/functions              | `is`/`has`/`should` prefix | `isValid`, `hasErrors`   |

---

## Functions

- **Prefer arrow functions** for callbacks, inline functions, and anything that doesn't need its own `this` binding or needs lexical `this`.
- **Use `function` declarations** for top-level, named, exported functions — they're hoisted and produce clearer stack traces.

```javascript
// Arrow — callback / inline
items.filter((item) => item.isActive);

// Function declaration — top-level exported function
export function parseFile(path) {
  // ...
}
```

- Use default parameters instead of manual `undefined` checks:

```javascript
// Correct
function greet(name = 'World') {
  return `Hello, ${name}`;
}

// Wrong
function greet(name) {
  name = name || 'World';
  return `Hello, ${name}`;
}
```

- Use rest parameters (`...args`) instead of the `arguments` object.
- Keep functions focused on one responsibility. If a function needs a comment explaining "and then it also...", split it.

---

## Modules

- One primary export per file where practical; named exports are preferred over a single default export, since named exports are easier to refactor and grep for.
- Group related small utilities in one file only when they are genuinely cohesive.
  Split a file once it accumulates unrelated concerns or grows large enough that its single responsibility is no longer obvious from its name.

```javascript
// Correct — named export
export function resolveBundle(name, root) {
  /* ... */
}

// Avoid default exports for library code
export default function resolveBundle(name, root) {
  /* ... */
}
```

---

## Classes

- Use `class` syntax for stateful objects with behavior; prefer plain objects and functions when there's no meaningful state or inheritance need.
- Use `#` private fields for internal state that must not be accessed externally.
- Avoid deep inheritance chains (more than one level). Prefer composition.

```javascript
export class RetryPolicy {
  #maxAttempts;

  constructor(maxAttempts = 3) {
    this.#maxAttempts = maxAttempts;
  }

  shouldRetry(attempt) {
    return attempt < this.#maxAttempts;
  }
}
```

---

## Destructuring and Spread

- Use object/array destructuring when accessing multiple properties from the same source.
- Use spread (`...`) for shallow copies and merges instead of `Object.assign` or manual loops.

```javascript
// Correct
const { name, version, tags = [] } = manifest;
const merged = { ...defaults, ...overrides };

// Wrong
const name = manifest.name;
const version = manifest.version;
```

---

## Template Literals and String Handling

- **Single quotes** for string literals; **template literals** (`` ` ``) for any interpolation or multi-line strings.
- Never concatenate with `+` when a template literal is clearer.

```javascript
// Correct
const message = `Hello ${user.name}, you have ${count} items`;

// Wrong
const message = 'Hello ' + user.name + ', you have ' + count + ' items';
```

---

## Equality

- Always use `===` and `!==`. Never use `==`/`!=` except the single idiomatic case of `value == null` (matches both `null` and `undefined`) when that dual-match is intentional and commented.

---

## Async and Promises

- **Always use `async`/`await`** over raw `.then()`/`.catch()` chains.
- Wrap awaited calls that can fail in `try/catch`; do not let rejected promises go unhandled.
- Never mix an `async` function with a `.then()` call on its own result — pick one style per function.

```javascript
// Correct
async function loadConfig(path) {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to load config at ${path}: ${err.message}`);
  }
}

// Wrong — mixed styles
async function loadConfig(path) {
  return readFile(path, 'utf8').then((raw) => JSON.parse(raw));
}
```

---

## Error Handling

- **Always throw `Error` (or an `Error` subclass).** Never `throw` a string, number, or plain object.
- Create custom `Error` subclasses when callers need to distinguish failure types programmatically (e.g. by `instanceof` or a `.code` property).
- Error messages should include enough context to diagnose without a debugger — what was being attempted and with what input.

```javascript
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

throw new ValidationError(`Invalid tag format: "${tag}"`, 'tags');
```

- Preserve the original error when wrapping. `Error` supports a `cause` option (standard since ES2022, not Node-specific):

```javascript
try {
  await connect();
} catch (err) {
  throw new Error('Failed to connect to service', { cause: err });
}
```

---

## Objects and Arrays

- Use object/array literal syntax (`{}`, `[]`) over constructors (`new Object()`, `new Array()`).
- Treat function inputs as immutable — do not mutate parameters. Return new objects/arrays instead.
- Prefer array methods (`.map`, `.filter`, `.reduce`, `.find`) over manual `for` loops when transforming collections. Use a plain `for`/`for...of` loop when the logic involves early exit, index math, or side effects that don't fit a transformation pattern.

```javascript
// Correct — transformation
const activeNames = users.filter((u) => u.isActive).map((u) => u.name);

// Correct — early exit doesn't fit .find cleanly, but usually .find covers it
const admin = users.find((u) => u.role === 'admin');
```

---

## Comments and Documentation

- Use JSDoc (`/** ... */`) on all exported functions, classes, and non-trivial types.
- Use `//` line comments for implementation notes; explain _why_, not _what_ the code already makes clear.

### Mandatory JSDoc Tags

```javascript
/**
 * Resolve a bundle by name.
 * @param {string} bundleName - Name of the bundle (matches filename without .yaml)
 * @param {string} repoRoot   - Absolute path to the repository root
 * @returns {ResolvedBundle}
 */
export function resolveBundle(bundleName, repoRoot) {
  /* ... */
}
```

- `@param` is mandatory for every parameter, including a type.
- `@returns` is mandatory for non-`void` functions.
- `@throws` is required when a function intentionally throws.
- Use `@typedef` for shared object shapes returned or accepted by more than one function.
- Module-level file comments (`/** ... */` at the top of the file, describing the file's purpose) are encouraged in addition to — not instead of — the file header block below.

---

## File Header Block

Every `.js` file must begin with a header comment block:

```javascript
// ------------------------------
// {file-name}.js
//
// Author: {AuthorName} - {YYYY-MM-DD}
// Plan: {Plan ID}
//
// Copyright (c) {Company}. All rights reserved.
// ------------------------------
```

Rules:

- **Never omit the header.** Every `.js` file gets one regardless of size or purpose.
- `Author` is whoever created the file. If an AI agent creates it, use the configured AI identity name.
- `Plan` is the Plan ID (or equivalent) that caused this file to be created or meaningfully modified.
- If a file is modified under a new plan, add the new Plan ID (do not remove the original).
- This mirrors the header block convention in `csharp_base`. It may be extracted into its own cross-language standard in the future if more languages adopt it.

---

## Security Requirements

These general-purpose items apply to every JS plan's security checklist, regardless of runtime. See the runtime layer (e.g. `javascript_node`) for additional runtime-specific security items.

- [ ] No `eval()` or `new Function()` on dynamic strings
- [ ] `JSON.parse` output is treated as untrusted — validate shape before use, no direct property access assuming a schema
- [ ] Error messages shown to end users don't leak stack traces or internal implementation details

---

## Formatting

| Aspect          | Convention                                            |
| --------------- | ----------------------------------------------------- |
| Indentation     | 2 spaces                                              |
| Semicolons      | Always required                                       |
| Quotes          | Single (`'`) for strings; backticks for interpolation |
| Trailing commas | Yes, on multi-line literals                           |
| Line length     | ~100 characters (soft limit)                          |

---

## Linting and Formatting Tooling

This standard documents the _shape_ of expected tooling config; adding the actual config files to a given repo is a separate implementation task, not part of authoring this standard.

A compliant project's ESLint config should:

- Enforce `const`/`let` over `var`
- Enforce `===`/`!==` over `==`/`!=`
- Enforce single quotes and required semicolons
- Flag unused variables
- Flag `eval`/`new Function`

A compliant project's Prettier (or equivalent) config should match the formatting table above (2-space indent, single quotes, trailing commas on multi-line literals, ~100 character print width).
