// ------------------------------
// resolver-requires-skills.test.js
//
// Author: Starvoxel AI Agent - 2026-10-04
// Plan: AIF-006
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { resolveBundle } from '../../lib/resolver.js';
import { computeBundleSourceHashes } from '../../lib/snapshot/io.js';
import { createTempRepo, destroyTempRepo } from '../helpers/fixture.js';

/** Overwrite a skill's SKILL.md with a requires_skills frontmatter. */
function writeSkill(repo, name, requires, body = '') {
  const list = requires === undefined ? '' : `requires_skills: ${JSON.stringify(requires)}\n`;
  writeFileSync(
    join(repo, 'skills', name, 'SKILL.md'),
    `---\nname: ${name}\nversion: 1.0.0\ndescription: d\n${list}---\n# ${name}\n${body}\n`,
    'utf8',
  );
}

function writeSteering(repo, rel, requires) {
  writeFileSync(
    join(repo, rel),
    `---\nname: s\nversion: 1.0.0\ndescription: d\nrequires_skills: ${JSON.stringify(requires)}\n---\n# s\n`,
    'utf8',
  );
}

describe('integration: resolver requires_skills', () => {
  let repo;

  beforeEach(() => {
    repo = createTempRepo({
      agents: [
        {
          name: 'alpha',
          version: '0.1.0',
          domain: 'engineering',
          description: 'A',
          prompt: 'x',
          tools: [],
          approved_tools: [],
          skills: ['skill/feature-planning'],
        },
      ],
      skills: ['feature-planning', 'plan-lifecycle', 'leaf', 'other'],
      steering: { global: ['core.md'], engineering: ['core.md'] },
      bundles: [
        { name: 'engineering', version: '1.0.0', description: 'E', domain: 'engineering' },
        { name: 'explicit', version: '1.0.0', description: 'X', skills: ['feature-planning'] },
      ],
    });
  });

  afterEach(() => {
    destroyTempRepo(repo);
  });

  it('installs the transitive closure of an agent skill, deduplicated', () => {
    writeSkill(repo, 'feature-planning', ['plan-lifecycle', 'leaf']);
    writeSkill(repo, 'plan-lifecycle', ['leaf']);
    const result = resolveBundle('engineering', repo);
    assert.deepEqual(result.skills.sort(), ['feature-planning', 'leaf', 'plan-lifecycle']);
  });

  it('gives a no-domain bundle with explicit skills the closure', () => {
    writeSkill(repo, 'feature-planning', ['plan-lifecycle']);
    const result = resolveBundle('explicit', repo);
    assert.deepEqual(result.skills.sort(), ['feature-planning', 'plan-lifecycle']);
  });

  it('seeds from requires_skills of resolved steering files', () => {
    writeSteering(repo, 'steering/engineering/core.md', ['skill/plan-lifecycle']);
    const result = resolveBundle('engineering', repo);
    assert.deepEqual(result.skills.sort(), ['feature-planning', 'plan-lifecycle']);
  });

  it('ignores steering requires_skills for steering outside the bundle', () => {
    writeSteering(repo, 'steering/engineering/core.md', ['plan-lifecycle']);
    const result = resolveBundle('explicit', repo);
    assert.deepEqual(result.skills, ['feature-planning']);
  });

  it('resolves cycles once each without error', () => {
    writeSkill(repo, 'feature-planning', ['plan-lifecycle']);
    writeSkill(repo, 'plan-lifecycle', ['feature-planning']);
    const result = resolveBundle('engineering', repo);
    assert.deepEqual(result.skills.sort(), ['feature-planning', 'plan-lifecycle']);
  });

  it('throws naming the chain when a required skill is missing', () => {
    writeSkill(repo, 'feature-planning', ['ghost']);
    assert.throws(
      () => resolveBundle('engineering', repo),
      /feature-planning → ghost → \(missing\)/,
    );
  });

  it('throws on a non-list requires_skills', () => {
    writeFileSync(
      join(repo, 'skills', 'feature-planning', 'SKILL.md'),
      '---\nname: feature-planning\nrequires_skills: plan-lifecycle\n---\n',
      'utf8',
    );
    assert.throws(() => resolveBundle('engineering', repo), /must be a list/);
  });

  it('rejects traversal entries instead of reading outside skills/', () => {
    mkdirSync(join(repo, 'outside'), { recursive: true });
    writeFileSync(join(repo, 'outside', 'SKILL.md'), '# outside\n', 'utf8');
    for (const bad of ['../outside', 'a/b']) {
      writeSkill(repo, 'feature-planning', [bad]);
      assert.throws(() => resolveBundle('engineering', repo), /invalid requires_skills entry/);
    }
  });

  it('rejects an invalid name in a steering file', () => {
    writeSteering(repo, 'steering/global/core.md', ['../x']);
    assert.throws(() => resolveBundle('engineering', repo), /steering\/global\/core\.md/);
  });

  describe('stale detection via computeBundleSourceHashes()', () => {
    const hashes = () => computeBundleSourceHashes(resolveBundle('engineering', repo), repo);

    it('includes dependency-only skills', () => {
      writeSkill(repo, 'feature-planning', ['plan-lifecycle']);
      assert.ok('skills/plan-lifecycle/SKILL.md' in hashes());
    });

    it('changes when a required skill changes', () => {
      writeSkill(repo, 'feature-planning', ['plan-lifecycle']);
      const before = hashes();
      writeSkill(repo, 'plan-lifecycle', undefined, 'changed');
      const after = hashes();
      assert.notEqual(
        before['skills/plan-lifecycle/SKILL.md'],
        after['skills/plan-lifecycle/SKILL.md'],
      );
    });

    it('changes when a requires_skills line changes', () => {
      writeSkill(repo, 'feature-planning', ['plan-lifecycle']);
      const before = hashes();
      writeSkill(repo, 'feature-planning', ['plan-lifecycle', 'other']);
      const after = hashes();
      assert.notDeepEqual(before, after);
      assert.ok('skills/other/SKILL.md' in after);
    });
  });
});
