#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook — blocks Bash commands matching an agent's
 * blocked_commands patterns.
 *
 * Plan: AIF-007
 *
 * Invoked by Claude Code (via a subagent's frontmatter `hooks.PreToolUse`)
 * as: node cli.js "<pattern1>" "<pattern2>" ...
 *
 * Reads the PreToolUse hook JSON payload from stdin, extracts
 * `tool_input.command`, and checks it against the patterns passed as argv.
 * Exit code 2 blocks the tool call (Claude Code hook convention, with the
 * stderr message surfaced to the agent); exit code 0 allows it.
 *
 * Fails open (exit 0) on any read/parse/internal error — this hook enforces
 * workflow discipline (e.g. "use ai-git, not raw git"), not a security
 * boundary, so an unexpected input shape should not block all Bash usage.
 */

import { checkCommand, DYNAMIC_WORD_REASON } from './logic.js';

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

/**
 * Builds the stderr message for a block: what matched, what to do instead, and
 * the identity rule. Never includes the command text itself.
 * @param {{type: 'pattern', pattern: string} | {type: 'dynamic', word: string}} result
 * @returns {string}
 */
function formatBlockMessage(result) {
  const why =
    result.type === 'dynamic'
      ? `${DYNAMIC_WORD_REASON} (the command word cannot be determined statically; write it literally)`
      : `matches pattern '${result.pattern}'`;
  return (
    `Blocked by ai-foundation blocked_commands: ${why}. ` +
    'Use `ai-git` instead of raw git/gh. ' +
    'Never supply, infer or ask for a git identity (name or email); ' +
    'the identity comes only from .aiconfig.json via ai-git.'
  );
}

async function main() {
  const patterns = process.argv.slice(2);

  let input;
  try {
    input = await readStdin();
  } catch {
    process.exit(0);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
    return;
  }

  const command = payload && payload.tool_input && payload.tool_input.command;
  let result;
  try {
    result = checkCommand(command, patterns);
  } catch {
    process.exit(0);
    return;
  }

  if (result) {
    process.stderr.write(`${formatBlockMessage(result)}\n`);
    process.exit(2);
    return;
  }

  process.exit(0);
}

main();
