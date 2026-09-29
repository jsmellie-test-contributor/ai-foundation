/**
 * Integration tests for the init command (filesystem operations).
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runInit } from '../../lib/commands/init.js';

describe('integration: init command', () => {
  let workDir;
  let originalCwd;
  let originalIsTTY;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'aif-init-'));
    originalCwd = process.cwd();
    originalIsTTY = process.stdin.isTTY;
    // Force non-TTY so interactive mode doesn't trigger in tests
    process.stdin.isTTY = false;
    process.chdir(workDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.stdin.isTTY = originalIsTTY;
    rmSync(workDir, { recursive: true, force: true });
  });

  async function quiet(fn) {
    const origLog = console.log;
    const origErr = console.error;
    const output = [];
    console.log = (...args) => output.push(args.join(' '));
    console.error = (...args) => output.push(args.join(' '));
    try {
      const code = await fn();
      return { code, output };
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  }

  it('requires --name', async () => {
    const { code } = await quiet(() => runInit({ args: {}, positional: [] }));
    assert.equal(code, 1);
  });

  it('creates the project directory', async () => {
    const { code } = await quiet(() => runInit({ args: { name: 'test-project' }, positional: [] }));
    assert.equal(code, 0);
    assert.ok(existsSync(join(workDir, 'test-project')));
  });

  it('creates .aiconfig.json with correct name and repo_type', async () => {
    await quiet(() => runInit({ args: { name: 'my-app' }, positional: [] }));
    const config = JSON.parse(readFileSync(join(workDir, 'my-app', '.aiconfig.json'), 'utf8'));
    assert.equal(config.project_name, 'my-app');
    assert.equal(config.repo_type, 'project');
  });

  it('creates knowledge directory structure', async () => {
    await quiet(() => runInit({ args: { name: 'test' }, positional: [] }));
    assert.ok(existsSync(join(workDir, 'test', 'knowledge', 'decisions', '.gitkeep')));
    assert.ok(existsSync(join(workDir, 'test', 'knowledge', 'architecture', '.gitkeep')));
    assert.ok(existsSync(join(workDir, 'test', 'knowledge', 'research', '.gitkeep')));
    assert.ok(existsSync(join(workDir, 'test', 'knowledge', 'example.md')));
    assert.ok(!existsSync(join(workDir, 'test', 'knowledge', 'product')));
  });

  it('creates plans directory structure', async () => {
    await quiet(() => runInit({ args: { name: 'test' }, positional: [] }));
    assert.ok(existsSync(join(workDir, 'test', 'plans', 'features', '.gitkeep')));
  });

  it('creates project-standards.md with project name substituted', async () => {
    await quiet(() => runInit({ args: { name: 'my-app' }, positional: [] }));
    const content = readFileSync(join(workDir, 'my-app', 'project-standards.md'), 'utf8');
    assert.ok(content.includes('my-app'));
    assert.ok(!content.includes('{ProjectName}'));
  });

  it('fails if directory already exists without --force', async () => {
    mkdirSync(join(workDir, 'existing'));
    const { code, output } = await quiet(() =>
      runInit({ args: { name: 'existing' }, positional: [] }),
    );
    assert.equal(code, 1);
    assert.ok(output.some((l) => l.includes('already exists')));
  });

  it('succeeds with --force when directory exists', async () => {
    mkdirSync(join(workDir, 'existing'));
    const { code } = await quiet(() =>
      runInit({ args: { name: 'existing', force: true }, positional: [] }),
    );
    assert.equal(code, 0);
    assert.ok(existsSync(join(workDir, 'existing', '.aiconfig.json')));
  });

  it('rejects invalid project names', async () => {
    const { code, output } = await quiet(() =>
      runInit({ args: { name: '.bad-name' }, positional: [] }),
    );
    assert.equal(code, 1);
    assert.ok(output.some((l) => l.includes('Invalid')));
  });

  it('sets project_shortname and worktrees path when --shortname provided', async () => {
    await quiet(() => runInit({ args: { name: 'my-app', shortname: 'myapp' }, positional: [] }));
    const config = JSON.parse(readFileSync(join(workDir, 'my-app', '.aiconfig.json'), 'utf8'));
    assert.equal(config.project_shortname, 'myapp');
    assert.equal(config.paths.worktrees, '../worktrees/myapp');
  });

  it('falls back project_shortname to project_name when --shortname omitted', async () => {
    await quiet(() => runInit({ args: { name: 'my-app' }, positional: [] }));
    const config = JSON.parse(readFileSync(join(workDir, 'my-app', '.aiconfig.json'), 'utf8'));
    assert.equal(config.project_shortname, 'my-app');
    assert.equal(config.paths.worktrees, '../worktrees/my-app');
  });

  it('rejects a project short name over 5 characters', async () => {
    const { code, output } = await quiet(() =>
      runInit({ args: { name: 'my-app', shortname: 'toolongname' }, positional: [] }),
    );
    assert.equal(code, 1);
    assert.ok(output.some((l) => l.includes('Invalid project short name')));
  });
});
