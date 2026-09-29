import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TOOL_MAP,
  TARGETS,
  mapToolName,
  transformAgent,
  transformSteering,
  parseFrontmatter,
} from '../../lib/harnesses/kiro.js';

describe('unit: kiro adapter', () => {
  describe('TARGETS', () => {
    it('all paths are under ~/.kiro', () => {
      for (const [key, value] of Object.entries(TARGETS)) {
        assert.ok(value.includes('.kiro'), `TARGETS.${key} should be under ~/.kiro, got ${value}`);
      }
    });
  });

  describe('TOOL_MAP', () => {
    it('contains all standard tool names', () => {
      const expected = [
        'read',
        'write',
        'shell',
        'web_search',
        'web_fetch',
        'grep',
        'glob',
        'code',
        'subagent',
        'plan',
        'ask_user',
        'task',
        'skill',
      ];
      for (const name of expected) {
        assert.ok(name in TOOL_MAP, `missing ${name}`);
      }
    });

    it('maps to Kiro-native names (identity for Kiro adapter)', () => {
      assert.equal(TOOL_MAP['read'], 'read');
      assert.equal(TOOL_MAP['write'], 'write');
      assert.equal(TOOL_MAP['shell'], 'shell');
      assert.equal(TOOL_MAP['web_search'], 'web_search');
      assert.equal(TOOL_MAP['subagent'], 'subagent');
    });

    it('maps tools with no confirmed native Kiro equivalent to null', () => {
      assert.equal(TOOL_MAP['plan'], null);
      assert.equal(TOOL_MAP['ask_user'], null);
      assert.equal(TOOL_MAP['task'], null);
      assert.equal(TOOL_MAP['skill'], null);
    });
  });

  describe('mapToolName()', () => {
    it('maps standard tool names through the map', () => {
      assert.equal(mapToolName('read'), 'read');
      assert.equal(mapToolName('shell'), 'shell');
      assert.equal(mapToolName('web_search'), 'web_search');
    });

    it('returns null for tools with no confirmed native Kiro equivalent', () => {
      assert.equal(mapToolName('plan'), null);
      assert.equal(mapToolName('ask_user'), null);
      assert.equal(mapToolName('task'), null);
    });

    it('passes through @server/tool references unchanged', () => {
      assert.equal(mapToolName('@git/git_status'), '@git/git_status');
    });

    it('passes through unknown names unchanged', () => {
      assert.equal(mapToolName('some-future-tool'), 'some-future-tool');
    });
  });

  describe('transformAgent()', () => {
    const agent = {
      name: 'architect',
      version: '0.1.0',
      domain: 'engineering',
      description: 'Technical decision-making agent.',
      prompt: 'You are the Architect agent.',
      tools: ['read', 'write', 'web_search', 'shell', 'grep', 'glob'],
      approved_tools: ['read', 'web_search', 'grep', 'glob'],
      skills: ['skill/plan-lifecycle'],
    };

    it('maps name, description, and prompt directly', () => {
      const result = transformAgent(agent);
      assert.equal(result.name, 'architect');
      assert.equal(result.description, 'Technical decision-making agent.');
      assert.equal(result.prompt, 'You are the Architect agent.');
    });

    it('maps tools through TOOL_MAP', () => {
      const result = transformAgent(agent);
      assert.deepEqual(result.tools, ['read', 'write', 'web_search', 'shell', 'grep', 'glob']);
    });

    it('maps approved_tools to allowedTools through TOOL_MAP', () => {
      const result = transformAgent(agent);
      assert.deepEqual(result.allowedTools, ['read', 'web_search', 'grep', 'glob']);
    });

    it('drops tools with no confirmed native Kiro equivalent instead of guessing a name', () => {
      const withUnsupported = {
        ...agent,
        tools: ['read', 'plan', 'ask_user', 'task'],
        approved_tools: ['read', 'task'],
      };
      const result = transformAgent(withUnsupported);
      assert.deepEqual(result.tools, ['read']);
      assert.deepEqual(result.allowedTools, ['read']);
    });

    it('converts skills to skill:// resources', () => {
      const result = transformAgent(agent);
      assert.ok(result.resources.includes('skill://.kiro/skills/plan-lifecycle/SKILL.md'));
    });

    it('always includes steering resource', () => {
      const result = transformAgent(agent);
      assert.ok(result.resources.includes('file://.kiro/steering/**/*.md'));
    });

    it('handles agent with empty skills', () => {
      const noSkills = { ...agent, skills: [] };
      const result = transformAgent(noSkills);
      assert.deepEqual(result.resources, ['file://.kiro/steering/**/*.md']);
    });

    it('handles agent with no skills field', () => {
      const { skills, ...noSkillsField } = agent;
      const result = transformAgent(noSkillsField);
      assert.deepEqual(result.resources, ['file://.kiro/steering/**/*.md']);
    });

    it('passes @server/tool references through in tools', () => {
      const withServer = { ...agent, tools: ['read', '@git/git_status', '@git/git_diff'] };
      const result = transformAgent(withServer);
      assert.deepEqual(result.tools, ['read', '@git/git_status', '@git/git_diff']);
    });

    it('emits permissions deny rules for blocked_commands', () => {
      const withBlocked = { ...agent, blocked_commands: ['git *', 'gh *'] };
      const result = transformAgent(withBlocked);
      assert.deepEqual(result.permissions, {
        rules: [{ capability: 'shell', match: ['git *', 'gh *'], effect: 'deny' }],
      });
    });

    it('omits permissions when blocked_commands is absent', () => {
      const result = transformAgent(agent);
      assert.strictEqual(result.permissions, undefined);
    });

    it('omits permissions when blocked_commands is empty', () => {
      const withEmpty = { ...agent, blocked_commands: [] };
      const result = transformAgent(withEmpty);
      assert.strictEqual(result.permissions, undefined);
    });
  });

  describe('parseFrontmatter()', () => {
    it('parses valid frontmatter and body', () => {
      const content = '---\nname: "test"\nversion: "0.1.0"\n---\n# Body\n';
      const { frontmatter, body } = parseFrontmatter(content);
      assert.equal(frontmatter.name, 'test');
      assert.equal(body, '# Body\n');
    });

    it('returns null frontmatter for content without frontmatter', () => {
      const content = '# Just a heading\nSome text.';
      const { frontmatter, body } = parseFrontmatter(content);
      assert.equal(frontmatter, null);
      assert.equal(body, content);
    });
  });

  describe('transformSteering()', () => {
    it('emits inclusion: always when file_patterns is empty', () => {
      const input = '---\nname: "test"\nversion: "0.1.0"\nfile_patterns: []\n---\n# Rules\n';
      const result = transformSteering(input);
      assert.ok(result.includes('inclusion: always'));
      assert.ok(!result.includes('fileMatchPattern'));
      assert.ok(result.includes('# Rules'));
    });

    it('emits inclusion: always when file_patterns is absent', () => {
      const input = '---\nname: "test"\nversion: "0.1.0"\n---\n# Rules\n';
      const result = transformSteering(input);
      assert.ok(result.includes('inclusion: always'));
    });

    it('emits fileMatch and fileMatchPattern for non-empty file_patterns', () => {
      const input = '---\nname: "test"\nfile_patterns:\n  - "**/*.ts"\n---\n# TS Rules\n';
      const result = transformSteering(input);
      assert.ok(result.includes('inclusion: fileMatch'));
      assert.ok(result.includes('fileMatchPattern: "**/*.ts"'));
      assert.ok(result.includes('# TS Rules'));
    });

    it('joins multiple patterns with comma', () => {
      const input = '---\nfile_patterns:\n  - "**/*.ts"\n  - "src/**"\n---\n# Body\n';
      const result = transformSteering(input);
      assert.ok(result.includes('fileMatchPattern: "**/*.ts, src/**"'));
    });

    it('strips framework fields from output', () => {
      const input =
        '---\nname: "test"\nversion: "0.1.0"\ndescription: "Desc"\nfile_patterns: []\n---\n# Body\n';
      const result = transformSteering(input);
      assert.ok(!result.includes('name:'));
      assert.ok(!result.includes('version:'));
      assert.ok(!result.includes('description:'));
      assert.ok(!result.includes('file_patterns:'));
    });

    it('passes through content with no frontmatter unchanged', () => {
      const input = '# No frontmatter\nJust rules.';
      const result = transformSteering(input);
      assert.equal(result, input);
    });
  });
});
