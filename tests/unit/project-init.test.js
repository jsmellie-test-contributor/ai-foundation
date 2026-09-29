/**
 * Unit tests for project-init pure logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateProjectName,
  validateProjectShortname,
  applyProjectName,
  applyProjectConfig,
  buildAiConfig,
} from '../../lib/project-init.js';

// ── validateProjectName ──────────────────────────────────────────────────────

describe('unit: project-init/validateProjectName', () => {
  it('accepts a simple name', () => {
    assert.equal(validateProjectName('my-project').valid, true);
  });

  it('accepts alphanumeric with hyphens', () => {
    assert.equal(validateProjectName('app-2026').valid, true);
  });

  it('rejects empty string', () => {
    const result = validateProjectName('');
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('required'));
  });

  it('rejects null', () => {
    assert.equal(validateProjectName(null).valid, false);
  });

  it('rejects leading spaces', () => {
    const result = validateProjectName(' my-project');
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('spaces'));
  });

  it('rejects trailing spaces', () => {
    assert.equal(validateProjectName('my-project ').valid, false);
  });

  it('rejects invalid filesystem characters', () => {
    const bad = ['a<b', 'a>b', 'a:b', 'a"b', 'a|b', 'a?b', 'a*b', 'a/b', 'a\\b'];
    for (const name of bad) {
      assert.equal(validateProjectName(name).valid, false, `"${name}" should be invalid`);
    }
  });

  it('rejects names starting with dot', () => {
    assert.equal(validateProjectName('.hidden').valid, false);
  });

  it('rejects names starting with underscore', () => {
    assert.equal(validateProjectName('_private').valid, false);
  });

  it('rejects names over 100 characters', () => {
    assert.equal(validateProjectName('a'.repeat(101)).valid, false);
  });

  it('accepts names exactly 100 characters', () => {
    assert.equal(validateProjectName('a'.repeat(100)).valid, true);
  });
});

// ── validateProjectShortname ─────────────────────────────────────────────────

describe('unit: project-init/validateProjectShortname', () => {
  it('accepts a short name at the limit', () => {
    assert.equal(validateProjectShortname('myapp').valid, true);
  });

  it('accepts a short name under the limit', () => {
    assert.equal(validateProjectShortname('app').valid, true);
  });

  it('rejects empty string', () => {
    const result = validateProjectShortname('');
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('required'));
  });

  it('rejects null', () => {
    assert.equal(validateProjectShortname(null).valid, false);
  });

  it('rejects names over 5 characters', () => {
    const result = validateProjectShortname('myapp6');
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('5 characters'));
  });

  it('rejects leading or trailing spaces', () => {
    assert.equal(validateProjectShortname(' app').valid, false);
    assert.equal(validateProjectShortname('app ').valid, false);
  });

  it('rejects invalid filesystem characters', () => {
    const bad = ['a<b', 'a/b', 'a\\b'];
    for (const name of bad) {
      assert.equal(validateProjectShortname(name).valid, false, `"${name}" should be invalid`);
    }
  });

  it('rejects names starting with dot or underscore', () => {
    assert.equal(validateProjectShortname('.app').valid, false);
    assert.equal(validateProjectShortname('_app').valid, false);
  });
});

// ── applyProjectName ─────────────────────────────────────────────────────────

describe('unit: project-init/applyProjectName', () => {
  it('replaces {ProjectName} with the given name', () => {
    const result = applyProjectName('Project Name: {ProjectName}', 'cool-app');
    assert.equal(result, 'Project Name: cool-app');
  });

  it('replaces my-project with the given name', () => {
    const result = applyProjectName('"project_name": "my-project"', 'cool-app');
    assert.equal(result, '"project_name": "cool-app"');
  });

  it('replaces all occurrences of both placeholders', () => {
    const input = '{ProjectName} uses my-project as {ProjectName}';
    const result = applyProjectName(input, 'foo');
    assert.equal(result, 'foo uses foo as foo');
  });

  it('returns content unchanged if no placeholder present', () => {
    const input = 'no placeholder here';
    assert.equal(applyProjectName(input, 'test'), 'no placeholder here');
  });

  it('handles empty content', () => {
    assert.equal(applyProjectName('', 'test'), '');
  });
});

// ── applyProjectConfig — {ProjectShortName} ──────────────────────────────────

describe('unit: project-init/applyProjectConfig ProjectShortName substitution', () => {
  it('replaces {ProjectShortName} with projectShortname when provided', () => {
    const result = applyProjectConfig('Feature: {ProjectShortName}-001', {
      projectName: 'my-app',
      projectShortname: 'myapp',
    });
    assert.equal(result, 'Feature: myapp-001');
  });

  it('falls back to projectName when projectShortname is not provided', () => {
    const result = applyProjectConfig('Feature: {ProjectShortName}-001', { projectName: 'my-app' });
    assert.equal(result, 'Feature: my-app-001');
  });

  it('leaves placeholder unresolved when neither value is provided', () => {
    const result = applyProjectConfig('Feature: {ProjectShortName}-001', {});
    assert.equal(result, 'Feature: {ProjectShortName}-001');
  });
});

// ── buildAiConfig ─────────────────────────────────────────────────────────────

describe('unit: project-init/buildAiConfig', () => {
  it('sets project_shortname from projectShortname when provided', () => {
    const config = JSON.parse(buildAiConfig({ projectName: 'my-app', projectShortname: 'myapp' }));
    assert.equal(config.project_shortname, 'myapp');
  });

  it('falls back project_shortname to project_name when not provided', () => {
    const config = JSON.parse(buildAiConfig({ projectName: 'my-app' }));
    assert.equal(config.project_shortname, 'my-app');
  });

  it('sets paths.worktrees using the resolved shortname', () => {
    const config = JSON.parse(buildAiConfig({ projectName: 'my-app', projectShortname: 'myapp' }));
    assert.equal(config.paths.worktrees, '../worktrees/myapp');
  });
});
