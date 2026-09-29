import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  TOOL_MAP,
  TARGETS,
  mapToolName,
  mapAgentTools,
  transformAgent,
  transformSteering,
  parseFrontmatter,
  detectSharedResource,
  BLOCK_COMMAND_RESOURCE,
} from '../../lib/harnesses/claude.js';

describe('unit: claude adapter', () => {
  describe('TARGETS', () => {
    it('component paths are under the global ~/.claude/ directory', () => {
      const claudeBase = join(homedir(), '.claude');
      const { mcpSettings, ...componentTargets } = TARGETS;
      for (const [key, value] of Object.entries(componentTargets)) {
        assert.ok(
          value.startsWith(claudeBase),
          `TARGETS.${key} should be under ${claudeBase}, got ${value}`,
        );
      }
    });

    it('mcpSettings points to the global ~/.claude.json user-scope config', () => {
      assert.equal(TARGETS.mcpSettings, join(homedir(), '.claude.json'));
    });

    it('includes a scripts target for shared hook scripts', () => {
      const claudeBase = join(homedir(), '.claude');
      assert.equal(TARGETS.scripts, join(claudeBase, 'scripts'));
    });
  });

  // The real, current set of tool names Claude Code recognizes natively
  // (excluding hooks, MCP-server tools, and onboarding/marketplace tools
  // out of scope for agent frontmatter). TOOL_MAP must never reference a
  // name outside this list — that was exactly how `code` → `LSP` slipped
  // in as an unverified guess. Update this list only after confirming a
  // name against Claude Code's actual native tool surface.
  const KNOWN_NATIVE_TOOLS = new Set([
    'Read',
    'Write',
    'Edit',
    'Bash',
    'Grep',
    'Glob',
    'WebSearch',
    'WebFetch',
    'Agent',
    'ListAgents',
    'SendMessage',
    'EnterPlanMode',
    'ExitPlanMode',
    'AskUserQuestion',
    'TaskCreate',
    'TaskUpdate',
    'TaskGet',
    'TaskList',
    'TaskOutput',
    'TaskStop',
    'Skill',
  ]);

  describe('TOOL_MAP', () => {
    it('maps to Claude Code PascalCase names', () => {
      assert.deepEqual(TOOL_MAP['read'], ['Read']);
      assert.deepEqual(TOOL_MAP['write'], ['Write', 'Edit']);
      assert.deepEqual(TOOL_MAP['shell'], ['Bash']);
      assert.deepEqual(TOOL_MAP['web_search'], ['WebSearch']);
      assert.deepEqual(TOOL_MAP['web_fetch'], ['WebFetch']);
      assert.deepEqual(TOOL_MAP['grep'], ['Grep']);
      assert.deepEqual(TOOL_MAP['glob'], ['Glob']);
      assert.deepEqual(TOOL_MAP['subagent'], ['Agent', 'ListAgents', 'SendMessage']);
      assert.deepEqual(TOOL_MAP['plan'], ['EnterPlanMode', 'ExitPlanMode']);
      assert.deepEqual(TOOL_MAP['ask_user'], ['AskUserQuestion']);
      assert.deepEqual(TOOL_MAP['task'], [
        'TaskCreate',
        'TaskUpdate',
        'TaskGet',
        'TaskList',
        'TaskOutput',
        'TaskStop',
      ]);
      assert.deepEqual(TOOL_MAP['skill'], ['Skill']);
    });

    it('maps code to no native equivalent (verified absent, not guessed)', () => {
      assert.deepEqual(TOOL_MAP['code'], []);
    });

    it('never references a tool name outside the known native Claude Code surface', () => {
      for (const [generic, native] of Object.entries(TOOL_MAP)) {
        for (const name of native) {
          assert.ok(
            KNOWN_NATIVE_TOOLS.has(name),
            `TOOL_MAP['${generic}'] references unverified native tool "${name}"`,
          );
        }
      }
    });
  });

  describe('mapToolName()', () => {
    it('maps generic names to Claude Code names', () => {
      assert.equal(mapToolName('read'), 'Read');
      assert.equal(mapToolName('shell'), 'Bash');
      assert.equal(mapToolName('subagent'), 'Agent');
    });

    it('passes through a tool with no native equivalent unchanged', () => {
      assert.equal(mapToolName('code'), 'code');
    });

    it('passes through unknown names unchanged', () => {
      assert.equal(mapToolName('@git/git_status'), '@git/git_status');
      assert.equal(mapToolName('some-future-tool'), 'some-future-tool');
    });
  });

  describe('mapAgentTools()', () => {
    it('expands the generic write tool to both Write and Edit', () => {
      assert.deepEqual(mapAgentTools(['write']), ['Write', 'Edit']);
    });

    it('maps other tools normally alongside an expanded write', () => {
      assert.deepEqual(mapAgentTools(['read', 'write', 'grep']), ['Read', 'Write', 'Edit', 'Grep']);
    });

    it('expands subagent to its full orchestration cluster', () => {
      assert.deepEqual(mapAgentTools(['subagent']), ['Agent', 'ListAgents', 'SendMessage']);
    });

    it('expands plan and ask_user to their native tools', () => {
      assert.deepEqual(mapAgentTools(['plan', 'ask_user']), [
        'EnterPlanMode',
        'ExitPlanMode',
        'AskUserQuestion',
      ]);
    });

    it('contributes nothing for a tool with no native equivalent', () => {
      assert.deepEqual(mapAgentTools(['read', 'code', 'grep']), ['Read', 'Grep']);
    });

    it('passes through an unrecognized generic name unchanged', () => {
      assert.deepEqual(mapAgentTools(['@git/git_status']), ['@git/git_status']);
    });

    it('returns an empty list for an empty input', () => {
      assert.deepEqual(mapAgentTools([]), []);
    });
  });

  describe('transformAgent()', () => {
    const agent = {
      name: 'architect',
      version: '0.1.0',
      domain: 'engineering',
      description: 'Technical decision-making agent.',
      prompt: 'You are the Architect agent.\n\nYour role is to evaluate options.',
      tools: ['read', 'write', 'web_search', 'shell', 'grep', 'glob'],
      approved_tools: ['read', 'grep', 'glob'],
      skills: ['skill/plan-lifecycle'],
    };

    it('produces markdown with YAML frontmatter', () => {
      const result = transformAgent(agent);
      assert.ok(result.startsWith('---\n'));
      assert.ok(result.includes('---\n\n'));
    });

    it('includes name and description in frontmatter', () => {
      const result = transformAgent(agent);
      assert.ok(result.includes('name: architect'));
      assert.ok(result.includes('description: Technical decision-making agent.'));
    });

    it('maps tools to Claude Code names as comma-separated string, expanding write to Write and Edit', () => {
      const result = transformAgent(agent);
      assert.ok(result.includes('tools: Read, Write, Edit, WebSearch, Bash, Grep, Glob'));
    });

    it('includes prompt as markdown body', () => {
      const result = transformAgent(agent);
      assert.ok(result.includes('You are the Architect agent.'));
      assert.ok(result.includes('Your role is to evaluate options.'));
    });

    it('handles agent with no tools', () => {
      const noTools = { ...agent, tools: [] };
      const result = transformAgent(noTools);
      assert.ok(result.includes('tools: ""'));
    });

    describe('skills preload', () => {
      it('omits the skills field when preload_skills is absent (no silent behavior change)', () => {
        const result = transformAgent(agent);
        const { frontmatter } = parseFrontmatter(result);
        assert.equal(frontmatter.skills, undefined);
      });

      it('preloads all declared skills for the ["*"] sentinel, stripping the skill/ prefix', () => {
        const withWildcard = { ...agent, skills: ['skill/a', 'skill/b'], preload_skills: ['*'] };
        const result = transformAgent(withWildcard);
        const { frontmatter } = parseFrontmatter(result);
        assert.deepEqual(frontmatter.skills, ['a', 'b']);
      });

      it('preloads only the named subset when preload_skills lists specific skills', () => {
        const withSubset = {
          ...agent,
          skills: ['skill/a', 'skill/b', 'skill/c'],
          preload_skills: ['skill/b'],
        };
        const result = transformAgent(withSubset);
        const { frontmatter } = parseFrontmatter(result);
        assert.deepEqual(frontmatter.skills, ['b']);
      });
    });

    it('emits a PreToolUse hook on Bash for blocked_commands', () => {
      const withBlocked = { ...agent, blocked_commands: ['git *', 'gh *'] };
      const result = transformAgent(withBlocked);
      const { frontmatter } = parseFrontmatter(result);

      assert.ok(frontmatter.hooks);
      assert.ok(Array.isArray(frontmatter.hooks.PreToolUse));
      const entry = frontmatter.hooks.PreToolUse[0];
      assert.equal(entry.matcher, 'Bash');
      assert.equal(entry.hooks[0].type, 'command');
      assert.ok(entry.hooks[0].command.includes('"git *"'));
      assert.ok(entry.hooks[0].command.includes('"gh *"'));
      assert.ok(entry.hooks[0].command.includes('block-command'));
    });

    it('invokes the absolute Node binary path, not a bare "node" command', () => {
      const withBlocked = { ...agent, blocked_commands: ['git *'] };
      const result = transformAgent(withBlocked);
      const { frontmatter } = parseFrontmatter(result);
      const command = frontmatter.hooks.PreToolUse[0].hooks[0].command;

      // Must not rely on PATH resolution for "node" — must be the exact
      // absolute execPath of the Node binary that ran the install.
      assert.ok(command.includes(process.execPath));
      assert.ok(!command.startsWith('node '));
    });

    it('does not emit permissions.deny (unsupported by Claude Code subagent frontmatter)', () => {
      const withBlocked = { ...agent, blocked_commands: ['git *'] };
      const result = transformAgent(withBlocked);
      assert.ok(!result.includes('permissions'));
    });

    it('omits hooks when blocked_commands is absent', () => {
      const result = transformAgent(agent);
      assert.ok(!result.includes('hooks'));
    });

    it('omits hooks when blocked_commands is empty', () => {
      const withEmpty = { ...agent, blocked_commands: [] };
      const result = transformAgent(withEmpty);
      assert.ok(!result.includes('hooks'));
    });
  });

  describe('transformSteering()', () => {
    it('strips frontmatter for always-loaded rules (empty file_patterns)', () => {
      const input =
        '---\nname: "test"\nversion: "0.1.0"\nfile_patterns: []\n---\n# Rules\nContent here.\n';
      const result = transformSteering(input);
      assert.ok(!result.includes('---'));
      assert.ok(result.includes('# Rules'));
      assert.ok(result.includes('Content here.'));
    });

    it('emits paths frontmatter for conditional rules', () => {
      const input =
        '---\nname: "test"\nfile_patterns:\n  - "**/*.ts"\n  - "src/**"\n---\n# TS Rules\n';
      const result = transformSteering(input);
      assert.ok(result.includes('paths:'));
      assert.ok(result.includes('**/*.ts'));
      assert.ok(result.includes('src/**'));
      assert.ok(result.includes('# TS Rules'));
    });

    it('strips framework fields from output', () => {
      const input =
        '---\nname: "test"\nversion: "0.1.0"\ndescription: "Desc"\nfile_patterns:\n  - "**/*.ts"\n---\n# Body\n';
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

  describe('detectSharedResource()', () => {
    const baseAgent = {
      name: 'restricted',
      version: '0.1.0',
      domain: 'engineering',
      description: 'Restricted agent.',
      prompt: 'x',
      tools: ['read', 'shell'],
      approved_tools: ['read'],
    };

    it('returns the block-command resource name when blocked_commands is non-empty', () => {
      const agent = { ...baseAgent, blocked_commands: ['git *'] };
      assert.equal(detectSharedResource(agent), BLOCK_COMMAND_RESOURCE);
    });

    it('returns null when blocked_commands is absent', () => {
      assert.equal(detectSharedResource(baseAgent), null);
    });

    it('returns null when blocked_commands is an empty array', () => {
      const agent = { ...baseAgent, blocked_commands: [] };
      assert.equal(detectSharedResource(agent), null);
    });
  });
});
