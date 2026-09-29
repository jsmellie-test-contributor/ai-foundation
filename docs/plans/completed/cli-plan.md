# CLI Implementation Plan

Tracks the phased implementation of the `aif` CLI as defined in [AIF-ARCH-001](../decisions/architecture/AIF-ARCH-001_install-cli-redesign.decision.md).

## Progress

| Phase | Description                                                | Status      | Commit      |
| ----- | ---------------------------------------------------------- | ----------- | ----------- |
| 1     | CLI entry point, constants, manifest                       | ✅ Complete | Pre-session |
| 2     | Bundle resolver (`lib/resolver.js`)                        | ✅ Complete | `7e5cb65`   |
| 3     | Kiro harness adapter (`lib/harnesses/kiro.js`)             | ✅ Complete | `230675c`   |
| 4     | Command implementations (install, uninstall, status, list) | ✅ Complete | `4379c55`   |
| 5     | `aif validate` + `aif test` commands                       | ✅ Complete | `04fd21a`   |
| 6     | Claude Code adapter (`lib/harnesses/claude.js`)            | ✅ Complete | `c98bca2`   |
| 7     | Copilot adapter                                            | Planned     | —           |

## Commands

```bash
aif install --bundle <name> --harness <kiro|claude>
aif uninstall --bundle <name> --harness <kiro|claude>
aif status
aif list <bundles|agents|skills|servers>
aif validate [schema|refs|bundles]
aif test [unit|integration|validation]
```

## Architecture

```
bin/cli.js                    ← Entry point, arg parsing, routing
lib/
├── commands/
│   ├── install.js            ← Resolves bundle, delegates to adapter
│   ├── uninstall.js          ← Reads manifest, deletes files
│   ├── status.js             ← Hash-checks installed files
│   ├── list.js               ← Scans source directories
│   ├── validate.js           ← Schema, refs, bundle resolution checks
│   └── test.js               ← Runs node --test with category filtering
├── harnesses/
│   ├── kiro.js               ← Kiro adapter (YAML→JSON, steering→inclusion)
│   └── claude.js             ← Claude Code adapter (YAML→MD, steering→paths)
├── resolver.js               ← Bundle resolution (domain discovery + explicit)
├── manifest.js               ← .installs.yaml CRUD
└── constants.js              ← Shared config (harnesses, source dirs)
```

## Remaining Work

- **Phase 7: Copilot adapter** — `.instructions.md` format with `applyTo` glob patterns
- Server install implementation (deferred until first real server exists)
- Project-scoped installs (v2 — currently global only)
