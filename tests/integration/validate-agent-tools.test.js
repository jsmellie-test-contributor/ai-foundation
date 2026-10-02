// ------------------------------
// validate-agent-tools.test.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-010
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { runValidate } from '../../lib/commands/validate.js';
import { createTempRepo, destroyTempRepo } from '../helpers/fixture.js';

const AGENT = {
  name: 'a',
  version: '1.0.0',
  domain: 'eng',
  description: 'd',
  prompt: 'p',
  tools: ['read', '@dag/dag-validate'],
  approved_tools: ['read'],
};

/** Runs `aif validate schema`, capturing console output. */
function validateSchema(repo) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  let code;
  try {
    code = runValidate({ args: {}, positional: ['schema'] }, repo);
  } finally {
    console.log = original;
  }
  return { code, output: lines.join('\n') };
}

describe('integration: validate schema — agent tool names', () => {
  let repo;
  const withAgent = (overrides) => createTempRepo({ agents: [{ ...AGENT, ...overrides }] });

  beforeEach(() => {
    repo = undefined;
  });

  afterEach(() => {
    if (repo) destroyTempRepo(repo);
  });

  it('passes generic names and @server/tool references', () => {
    repo = withAgent({});
    const { code, output } = validateSchema(repo);
    assert.equal(code, 0, output);
  });

  it('rejects a bare typo in tools, naming the agent file and tool', () => {
    repo = withAgent({ tools: ['read', 'raed'] });
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /a.yaml: unknown tool 'raed' in tools/);
  });

  it('rejects a bare typo in approved_tools', () => {
    repo = withAgent({ tools: ['read', 'raed'], approved_tools: ['raed'] });
    const { output } = validateSchema(repo);
    assert.match(output, /unknown tool 'raed' in approved_tools/);
  });

  it('rejects a malformed @server reference', () => {
    repo = withAgent({ tools: ['read', '@dag'] });
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /unknown tool '@dag'/);
  });
});
