// ------------------------------
// install-dropped-tools.test.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-010
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runInstall } from '../../lib/commands/install.js';
import { TARGETS } from '../../lib/harnesses/kiro.js';
import { createTempRepo, destroyTempRepo } from '../helpers/fixture.js';

const AGENT = {
  name: 'test-agent',
  version: '0.1.0',
  domain: 'eng',
  description: 'Test.',
  prompt: 'You are test.',
  tools: ['read', 'plan', 'ask_user'],
  approved_tools: ['read', 'plan'],
};

describe('integration: install dropped-tool report and unknown-tool rejection', () => {
  let repo;
  let originalTargets;

  function setup(agent) {
    repo = createTempRepo({
      agents: [agent],
      steering: { global: ['core.md'] },
      bundles: [{ name: 'b', version: '1.0.0', description: 'B.', domain: 'eng' }],
    });
  }

  beforeEach(() => {
    const tempKiro = mkdtempSync(join(tmpdir(), 'aif-kiro-target-'));
    originalTargets = { ...TARGETS };
    TARGETS.agents = join(tempKiro, 'agents');
    TARGETS.steering = join(tempKiro, 'steering');
    TARGETS.skills = join(tempKiro, 'skills');
    TARGETS.servers = join(tempKiro, 'servers');
    TARGETS.standards = join(tempKiro, 'standards');
    TARGETS.mcpSettings = join(tempKiro, 'settings', 'mcp.json');
  });

  afterEach(() => {
    Object.assign(TARGETS, originalTargets);
    destroyTempRepo(repo);
  });

  /** Runs install, capturing stdout/stderr lines and the exit code. */
  function install() {
    const out = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...a) => out.push(a.join(' '));
    console.error = (...a) => out.push(a.join(' '));
    let code;
    try {
      code = runInstall({ args: { bundle: 'b', harness: 'kiro' }, positional: [] }, repo);
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
    return { code, output: out.join('\n') };
  }

  it('prints one dropped line per agent naming the harness and each dropped tool once', () => {
    setup(AGENT);
    const { code, output } = install();
    assert.equal(code, 0, output);
    const dropLines = output.split('\n').filter((l) => l.includes('dropped for'));
    assert.equal(dropLines.length, 1);
    assert.match(dropLines[0], /dropped for kiro: plan, ask_user$/);
  });

  it('prints no dropped line when every tool maps', () => {
    setup({ ...AGENT, tools: ['read'], approved_tools: ['read'] });
    const { code, output } = install();
    assert.equal(code, 0, output);
    assert.ok(!output.includes('dropped for'));
  });

  it('fails the install naming the agent and the unknown tool, writing no agent file', () => {
    setup({ ...AGENT, tools: ['read', 'raed'], approved_tools: ['read'] });
    const { code, output } = install();
    assert.equal(code, 1);
    assert.match(output, /agent "test-agent": unknown tool "raed"/);
    assert.ok(!existsSync(join(TARGETS.agents, 'test-agent.json')));
  });
});
