---
name: 'server-authoring'
version: '0.2.2'
description: 'Creates a server definition with tool documentation, implementation, and tests.'
---

## Purpose

Creates a new server definition in `servers/`. A server exposes tools that agents can call via a protocol (MCP, HTTP, etc.). The definition describes what tools exist, their inputs/outputs, and how to connect.

Use this skill when adding a new tool server to the framework.

---

## Inputs

- **Server name** — kebab-case identifier (becomes the folder name)
- **What tools it exposes** — names, descriptions, parameters
- **Protocol and transport** — `mcp`/`stdio`, `mcp`/`http`, `http`, etc.
- **Hosted** — `self` (we implement and run it) or `vendor` (a third party implements and runs it, e.g. a product's own official remote MCP endpoint). Defaults to `self`. See Step 1a for what changes when `hosted: "vendor"`.
- **Runtime dependencies** — any packages beyond what the protocol SDK provides (`hosted: "self"` only)

---

## Steps

### Step 1 — Create folder structure

For `hosted: "vendor"` servers, skip to Step 1a — the full structure below does not apply.

Create `servers/{name}/` containing:

```
servers/{name}/
├── {name}.yaml                        ← Server definition (required)
├── index.js                           ← Protocol entry point (required)
├── logic.js                           ← Pure business logic (required)
├── package.json                       ← Runtime dependencies for standalone install (required)
└── tests/
    ├── unit/
    │   └── {name}.test.js             ← Pure logic tests (required)
    └── integration/
        ├── {name}.test.js             ← I/O layer tests (required)
        └── {name}.mcp.test.js         ← MCP protocol layer tests (required for MCP servers)
```

**File naming conventions:**

| File                                   | Purpose                                                                                                                       |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `{name}.yaml`                          | Protocol-agnostic server definition. Declares tools, inputs, outputs.                                                         |
| `index.js`                             | Protocol entry point. Registers tools with the protocol SDK and connects the transport. This is what gets spawned at runtime. |
| `logic.js`                             | Pure business logic. No protocol awareness, no transport code. All tool implementations live here as exported functions.      |
| `package.json`                         | Declares runtime dependencies needed when the server is installed standalone (away from the monorepo).                        |
| `tests/unit/{name}.test.js`            | Tests pure logic functions directly. No I/O, no protocol.                                                                     |
| `tests/integration/{name}.test.js`     | Tests I/O layer functions against real filesystem.                                                                            |
| `tests/integration/{name}.mcp.test.js` | Tests MCP protocol layer via in-memory transport (tool listing + invocation).                                                 |

### Step 1a — Vendor-hosted servers (`hosted: "vendor"`)

When a third party implements and runs the server (e.g. a product's own official remote MCP endpoint), there is no local implementation:

- Create only `servers/{name}/{name}.yaml` — no `index.js`, `logic.js`, `package.json`, or `tests/` directory.
- Set `hosted: "vendor"`, `transport: "http"`, and a literal `url` (endpoint URLs are not secret).
- If the endpoint requires auth headers, use a `${ENV_VAR_NAME}` placeholder in `headers` — never a literal secret. See `skills/server-authoring/reference/schema.yaml` for the full field docs and an example.
- Source `tools[].name`/`inputs`/`outputs` from a live `listTools()` call against a real instance of the vendor's server, not from vendor marketing docs — exact parameter schemas are usually not published statically, and transcribed prose risks being wrong or stale. Note in each tool's `description` whether the schema was confirmed live or is doc-derived.
- Tool names are whatever the vendor registers them as (often not kebab-case) — do not rename them to fit our convention; the name must match what actually gets invoked at runtime.
- Skip to Step 7 (Self-validate) — Steps 2–6 below describe implementing a self-hosted server and don't apply.

### Step 2 — Write the YAML definition

Use the schema in `skills/server-authoring/reference/schema.yaml`.

Every tool must document:

- `name` — what agents reference via `@server/tool_name`
- `description` — when to use it (one or two sentences)
- `inputs` — every parameter with type and description
- `outputs` — what is returned

### Step 3 — Implement pure logic (`logic.js`)

All business logic goes in `logic.js` as exported functions:

- Functions take data in and return data out
- No protocol awareness (no MCP types, no transport references)
- I/O (file reads, network calls) is acceptable here but should be minimal
- Each tool maps to one exported function

### Step 4 — Implement the protocol entry point (`index.js`)

The entry point is a thin wrapper that:

1. Imports logic functions from `logic.js`
2. Registers each tool with the protocol SDK
3. Connects the transport and starts listening

See the protocol-specific section below for implementation details.

### Step 5 — Create `package.json`

The server's `package.json` declares dependencies needed for standalone installation:

```json
{
  "name": "aif-server-{name}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Brief description matching the YAML.",
  "engines": { "node": ">=22.0.0" },
  "dependencies": {
    // Protocol SDK + any runtime-only deps
  }
}
```

Only include dependencies that are needed at runtime. Dev/test dependencies live in the monorepo root `package.json`, not here.

### Step 6 — Write tests

Tests are organized into `tests/unit/` and `tests/integration/`:

**Unit tests** (`tests/unit/{name}.test.js`):

- Import pure functions from `logic.js`
- Call functions directly with in-memory data
- No filesystem, no network, no protocol
- Cover happy paths, error cases, edge cases

**Integration tests** (`tests/integration/{name}.test.js`):

- Import I/O-layer functions from `logic.js`
- Test against real filesystem (temp files)
- Cover file read errors, invalid content, end-to-end flows

**MCP protocol tests** (`tests/integration/{name}.mcp.test.js`):

- Instantiate the server with an in-memory transport
- Connect a test client
- Verify tool listing and invocation end-to-end via the MCP protocol

Use `node:test` with `describe/it` structure. Group tests under descriptive prefixes: `describe('unit: ...')`, `describe('integration: ...')`, `describe('mcp: ...')`.

### Step 7 — Self-validate

- [ ] Folder is `servers/{name}/`
- [ ] YAML has `name`, `version`, `protocol`, `transport`, `description`, `tools`
- [ ] `name` is kebab-case, matches folder name
- [ ] Every tool has `name`, `description`, `inputs`, `outputs`
- [ ] Input types are specified: `string`, `number`, `boolean`, `array`, `object`
- [ ] Optional inputs are marked `[optional]`
- [ ] No literal secrets in `headers` — `${ENV_VAR_NAME}` placeholders only
- [ ] Every citation of another skill, agent, or doc is checked against `steering/engineering/core.md`: "Cite, Don't Restate"

For `hosted: "self"` (default) additionally:

- [ ] `logic.js` contains only pure business logic — no protocol imports
- [ ] `index.js` is a thin protocol wrapper — imports from `logic.js`, registers tools
- [ ] `package.json` declares runtime dependencies for standalone install
- [ ] `tests/unit/{name}.test.js` tests pure logic with no I/O
- [ ] `tests/integration/{name}.test.js` tests I/O layer with real files
- [ ] `tests/integration/{name}.mcp.test.js` tests MCP protocol layer (for MCP servers)
- [ ] Protocol tests cover: tool listing, tool invocation with valid input, error handling
- [ ] Tool `name`s are kebab-case (we control the naming)

For `hosted: "vendor"` additionally:

- [ ] Only `{name}.yaml` exists — no `index.js`/`logic.js`/`package.json`/`tests/`
- [ ] `url` is set (http transport) and is a literal value, not a placeholder
- [ ] Tool list was sourced from a live `listTools()` call, not transcribed from vendor docs (or the gap is explicitly noted per tool)

---

## Protocol: MCP

When `protocol: "mcp"` in the YAML definition, the server must implement the Model Context Protocol using `@modelcontextprotocol/sdk`.

### MCP entry point (`index.js`)

```js
#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { myToolFunction } from './logic.js';

const server = new McpServer({
  name: '{server-name}',
  version: '{version}',
});

server.registerTool(
  '{tool-name}',
  {
    description: '{tool description}',
    inputSchema: {
      param_name: z.string().describe('Parameter description'),
    },
  },
  async ({ param_name }) => {
    const result = myToolFunction(param_name);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('{server-name} MCP server running on stdio');
}

main().catch((error) => {
  console.error('{server-name} MCP server error:', error);
  process.exit(1);
});
```

### MCP `package.json` dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.30.0"
  }
}
```

Pin the SDK version. Zod is provided as a peer dependency of the SDK — do not list it separately unless you need a specific version.

### MCP protocol tests

Use the SDK's `InMemoryTransport` and `Client` to test without spawning a process:

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Create server (same registration as index.js but without stdio)
const server = createServer();
const client = new Client({ name: 'test-client', version: '1.0.0' });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
await client.connect(clientTransport);

// Test tool listing
const tools = await client.listTools();

// Test tool invocation
const result = await client.callTool({ name: 'tool-name', arguments: { ... } });
```

Protocol tests must verify:

- All declared tools appear in `listTools()` response
- Each tool has a description and input schema
- Tool invocation returns expected results for valid input
- Tool invocation handles errors gracefully (no unhandled exceptions)

---

## Outputs

- **`servers/{name}/{name}.yaml`** — server definition
- **`servers/{name}/index.js`** — protocol entry point
- **`servers/{name}/logic.js`** — pure business logic
- **`servers/{name}/package.json`** — runtime dependencies
- **`servers/{name}/tests/unit/{name}.test.js`** — pure logic tests
- **`servers/{name}/tests/integration/{name}.test.js`** — I/O layer tests
- **`servers/{name}/tests/integration/{name}.mcp.test.js`** — MCP protocol tests (MCP servers only)

---

## Edge Cases

- **Server requires external infrastructure** — mark tool invocation tests as skipped with documented reason. Tool listing and protocol connection tests are never optional.
- **Server not yet implemented** — definition-only is acceptable during planning. Set `version: "0.x.y"` to signal it's not yet validated. Implementation is required before the server can be installed. (This applies to `hosted: "self"` — a `hosted: "vendor"` server's yaml is complete once written, since there's nothing for us to implement.)
- **Tool has complex input schema** — use zod's composable types in `index.js`. Document complex schemas with examples in the YAML `outputs` field.
- **Tool name collides with another server** — agents disambiguate via the `@server/tool` format, so same tool names across different servers is fine.
- **Non-MCP protocols** — follow the same `index.js`/`logic.js` split. The protocol-specific section for that protocol will be added to this skill when needed.
- **Vendor-hosted server (no local implementation)** — see Step 1a. The defining trait is that a third party runs the actual server; we only document how to connect to it. No `logic.js`/`index.js`/`package.json`/tests exist, tool names follow the vendor's own convention rather than our kebab-case rule, and `tools[].inputs`/`outputs` should be confirmed against a live `listTools()` call rather than vendor prose docs, which are often incomplete or imprecise about exact parameters.
- **Vendor-hosted server needs auth** — never write a literal secret into the committed yaml. Use a `${ENV_VAR_NAME}` placeholder in `headers`; the installer resolves it from the environment at install time (see `lib/harnesses/claude.js`'s `installMcpHttp`) and fails clearly if the variable is unset.
