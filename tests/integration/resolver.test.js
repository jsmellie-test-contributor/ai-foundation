import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

import { resolveBundle, listBundles } from '../../lib/resolver.js';
import { createTempRepo, destroyTempRepo } from '../helpers/fixture.js';

describe('integration: resolver', () => {
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
          tools: ['file-read', '@git/git_status'],
          approved_tools: [],
          skills: ['skill/plan-lifecycle', 'skill/task-orchestration'],
        },
        {
          name: 'beta',
          version: '0.1.0',
          domain: 'engineering',
          description: 'B',
          prompt: 'x',
          tools: ['@git/git_diff'],
          approved_tools: [],
          skills: ['skill/plan-lifecycle'],
        },
        {
          name: 'gamma',
          version: '0.1.0',
          domain: 'product',
          description: 'C',
          prompt: 'x',
          tools: [],
          approved_tools: [],
          skills: [],
        },
      ],
      skills: ['plan-lifecycle', 'task-orchestration'],
      steering: { global: ['core.md'], engineering: ['core.md', 'git-workflow.md'] },
      servers: ['git'],
      bundles: [
        {
          name: 'engineering',
          version: '1.0.0',
          description: 'Engineering bundle',
          domain: 'engineering',
        },
        {
          name: 'custom',
          version: '1.0.0',
          description: 'Custom',
          agents: ['gamma.yaml'],
          skills: ['task-orchestration'],
          steering: ['steering/global/core.md'],
          servers: ['git'],
        },
      ],
    });
  });

  afterEach(() => {
    destroyTempRepo(repo);
  });

  describe('resolveBundle()', () => {
    it('throws when bundle file does not exist', () => {
      assert.throws(() => resolveBundle('nonexistent', repo), /Bundle not found: nonexistent/);
    });

    it('throws when bundle has neither domain nor explicit lists', () => {
      mkdirSync(join(repo, 'bundles', 'empty'), { recursive: true });
      writeFileSync(
        join(repo, 'bundles', 'empty', 'bundle.yaml'),
        YAML.stringify({ name: 'empty', version: '1.0.0', description: 'Empty' }),
        'utf8',
      );

      assert.throws(
        () => resolveBundle('empty', repo),
        /specifies neither a domain nor explicit component lists/,
      );
    });

    it('discovers agents by domain', () => {
      const result = resolveBundle('engineering', repo);
      assert.deepEqual(result.agents.sort(), ['alpha.yaml', 'beta.yaml']);
    });

    it('collects skills from discovered agents (deduplicated)', () => {
      const result = resolveBundle('engineering', repo);
      assert.deepEqual(result.skills.sort(), ['plan-lifecycle', 'task-orchestration']);
    });

    it('collects global and domain steering, excluding underscore-prefixed files', () => {
      writeFileSync(join(repo, 'steering', 'global', '_template.md'), '# skip\n', 'utf8');

      const result = resolveBundle('engineering', repo);
      assert.deepEqual(result.steering.sort(), [
        'steering/engineering/core.md',
        'steering/engineering/git-workflow.md',
        'steering/global/core.md',
      ]);
    });

    it('resolves servers from @server/tool references (deduplicated, existing only)', () => {
      const result = resolveBundle('engineering', repo);
      assert.deepEqual(result.servers, ['git']);
    });

    it('resolves a bundle with only explicit lists (no domain)', () => {
      const result = resolveBundle('custom', repo);
      assert.deepEqual(result.agents, ['gamma.yaml']);
      assert.deepEqual(result.skills, ['task-orchestration']);
      assert.deepEqual(result.steering, ['steering/global/core.md']);
      assert.deepEqual(result.servers, ['git']);
    });

    it('appends explicit lists to domain-discovered components', () => {
      mkdirSync(join(repo, 'bundles', 'eng-plus'), { recursive: true });
      writeFileSync(
        join(repo, 'bundles', 'eng-plus', 'bundle.yaml'),
        YAML.stringify({
          name: 'eng-plus',
          version: '1.0.0',
          description: 'Eng+',
          domain: 'engineering',
          agents: ['external.yaml'],
          servers: ['extra'],
        }),
        'utf8',
      );

      const result = resolveBundle('eng-plus', repo);
      assert.ok(result.agents.includes('alpha.yaml'));
      assert.ok(result.agents.includes('external.yaml'));
      assert.ok(result.servers.includes('git'));
      assert.ok(result.servers.includes('extra'));
    });

    it('deduplicates when explicit list overlaps with domain discovery', () => {
      mkdirSync(join(repo, 'bundles', 'overlap'), { recursive: true });
      writeFileSync(
        join(repo, 'bundles', 'overlap', 'bundle.yaml'),
        YAML.stringify({
          name: 'overlap',
          version: '1.0.0',
          description: 'Overlap',
          domain: 'engineering',
          agents: ['alpha.yaml'],
        }),
        'utf8',
      );

      const result = resolveBundle('overlap', repo);
      const alphaCount = result.agents.filter((a) => a === 'alpha.yaml').length;
      assert.equal(alphaCount, 1);
    });
  });

  describe('listBundles()', () => {
    it('returns bundle directory names, excludes _template', () => {
      mkdirSync(join(repo, 'bundles', '_template'), { recursive: true });
      writeFileSync(
        join(repo, 'bundles', '_template', 'bundle.yaml'),
        YAML.stringify({ name: 'template', version: '0.1.0', description: 'T' }),
        'utf8',
      );

      const result = listBundles(repo);
      assert.ok(result.includes('engineering'));
      assert.ok(result.includes('custom'));
      assert.ok(!result.includes('_template'));
    });

    it('returns empty array when bundles dir does not exist', () => {
      const bare = createTempRepo();
      try {
        assert.deepEqual(listBundles(bare), []);
      } finally {
        destroyTempRepo(bare);
      }
    });
  });
});
