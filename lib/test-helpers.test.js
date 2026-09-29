import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEMVER_PATTERN,
  KEBAB_CASE_PATTERN,
  parseYaml,
  getAgentFiles,
  getServerFolders,
  getSkillFolders,
} from './test-helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

describe('SEMVER_PATTERN', () => {
  const valid = [
    '0.1.0',
    '1.0.0',
    '12.34.56',
    '1.0.0-alpha',
    '1.0.0-alpha.1',
    '1.0.0+build',
    '1.0.0-rc.1+build.42',
  ];
  const invalid = ['1.0', '1', 'v1.0.0', '1.0.0.0', '1.0.0-', '1.0.0+', ''];

  for (const v of valid) {
    it(`accepts "${v}"`, () => {
      assert.match(v, SEMVER_PATTERN);
    });
  }

  for (const v of invalid) {
    it(`rejects "${v}"`, () => {
      assert.doesNotMatch(v, SEMVER_PATTERN);
    });
  }
});

describe('KEBAB_CASE_PATTERN', () => {
  const valid = ['agent', 'software-engineer', 'principal-engineer', 'a1-b2-c3'];
  const invalid = [
    'Agent',
    'Software-Engineer',
    'engineering_manager',
    '-leading',
    'trailing-',
    'double--dash',
    '1starts-with-number',
    '',
  ];

  for (const v of valid) {
    it(`accepts "${v}"`, () => {
      assert.match(v, KEBAB_CASE_PATTERN);
    });
  }

  for (const v of invalid) {
    it(`rejects "${v}"`, () => {
      assert.doesNotMatch(v, KEBAB_CASE_PATTERN);
    });
  }
});

describe('parseYaml', () => {
  it('returns null for non-existent file', () => {
    const result = parseYaml(join(ROOT, 'does-not-exist.yaml'));
    assert.equal(result, null);
  });

  it('parses a valid yaml file', () => {
    const result = parseYaml(join(ROOT, 'agents', 'software-engineer.yaml'));
    assert.equal(result.name, 'software-engineer');
  });
});

describe('getAgentFiles', () => {
  it('returns agent .yaml files excluding template', () => {
    const files = getAgentFiles(join(ROOT, 'agents'));
    assert.ok(files.includes('software-engineer.yaml'));
    assert.ok(!files.includes('_template.yaml'));
  });

  it('returns empty array for non-existent directory', () => {
    const files = getAgentFiles(join(ROOT, 'nonexistent'));
    assert.deepEqual(files, []);
  });
});

describe('getServerFolders', () => {
  it('excludes _template folder', () => {
    const folders = getServerFolders(join(ROOT, 'servers'));
    assert.ok(!folders.includes('_template'));
  });

  it('returns empty array for non-existent directory', () => {
    const folders = getServerFolders(join(ROOT, 'nonexistent'));
    assert.deepEqual(folders, []);
  });
});

describe('getSkillFolders', () => {
  it('excludes _template folder', () => {
    const folders = getSkillFolders(join(ROOT, 'skills'));
    assert.ok(!folders.includes('_template'));
  });

  it('returns empty array for non-existent directory', () => {
    const folders = getSkillFolders(join(ROOT, 'nonexistent'));
    assert.deepEqual(folders, []);
  });
});
