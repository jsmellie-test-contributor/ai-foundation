import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { runValidate } from '../../lib/commands/validate.js';
import { createTempRepo, destroyTempRepo } from '../helpers/fixture.js';

const VALID = { name: 'good', version: '1.0.0', description: 'A good bundle.' };

/** Writes bundles/<folder>/bundle.yaml with raw text content. */
function writeBundle(repo, folder, content) {
  const dir = join(repo, 'bundles', folder);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'bundle.yaml'), content, 'utf8');
}

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

describe('integration: validate schema — bundles', () => {
  let repo;

  beforeEach(() => {
    repo = createTempRepo({ bundles: [VALID] });
  });

  afterEach(() => {
    destroyTempRepo(repo);
  });

  it('passes a valid bundle directory', () => {
    const { code, output } = validateSchema(repo);
    assert.equal(code, 0, output);
  });

  it("reports a missing 'name' with the real path", () => {
    writeBundle(repo, 'bad', 'version: "1.0.0"\ndescription: "x"\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /bundles\/bad\/bundle\.yaml: missing 'name'/);
  });

  it("reports a missing 'version'", () => {
    writeBundle(repo, 'bad', 'name: "bad"\ndescription: "x"\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /bundles\/bad\/bundle\.yaml: missing 'version'/);
  });

  it('reports an invalid semver', () => {
    writeBundle(repo, 'bad', 'name: "bad"\nversion: "1.0"\ndescription: "x"\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /bundles\/bad\/bundle\.yaml: invalid semver/);
  });

  it("reports a missing 'description'", () => {
    writeBundle(repo, 'bad', 'name: "bad"\nversion: "1.0.0"\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /bundles\/bad\/bundle\.yaml: missing 'description'/);
  });

  it("reports a 'name' that doesn't match the folder", () => {
    writeBundle(repo, 'bad', 'name: "other"\nversion: "1.0.0"\ndescription: "x"\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /bundles\/bad\/bundle\.yaml: name 'other' doesn't match folder/);
  });

  it("reports a 'name' that isn't kebab-case", () => {
    writeBundle(repo, 'Bad_One', 'name: "Bad_One"\nversion: "1.0.0"\ndescription: "x"\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /bundles\/Bad_One\/bundle\.yaml: name is not kebab-case/);
  });

  it('reports invalid YAML', () => {
    writeBundle(repo, 'bad', 'name: [unclosed\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 1);
    assert.match(output, /bundles\/bad\/bundle\.yaml: invalid YAML/);
  });

  it('skips folders starting with _', () => {
    writeBundle(repo, '_template', 'nothing: valid\n');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 0, output);
  });

  it('ignores flat .yaml files directly under bundles/', () => {
    writeFileSync(join(repo, 'bundles', 'flat.yaml'), 'nothing: valid\n', 'utf8');
    const { code, output } = validateSchema(repo);
    assert.equal(code, 0, output);
  });
});
