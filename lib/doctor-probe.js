#!/usr/bin/env node
/**
 * Token probe for `ai-git doctor` — Plan AIF-008, Task 002.
 *
 * Run as `<secrets.run wrapper> node <this file>` so the wrapper injects
 * the secret into this process only. Exits 0 if the env var named by
 * AIF_DOCTOR_TOKEN_VAR is set and non-empty, else 1. Prints nothing and
 * never reads the value beyond a truthiness test. A committed file (not
 * `node -e`) so the wrapper's argv has no shell metacharacters.
 */
const name = process.env.AIF_DOCTOR_TOKEN_VAR;
process.exit(name && process.env[name] ? 0 : 1);
