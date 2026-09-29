/**
 * Unit tests for lib/aiconfig-resolve.js — pure .aiconfig.json field
 * resolution. No filesystem access anywhere here: projectRoot is just a
 * string the defaults' basename()/template logic uses, never a real path
 * that gets created or cleaned up.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { basename } from 'node:path';

import { resolveConfigValue } from '../../lib/aiconfig-resolve.js';

// Any string works — resolveConfigValue never touches disk. Only the
// project_name test below cares about its actual basename.
const FAKE_ROOT = '/fake/project/root';

describe('unit: aiconfig', () => {
  describe('resolveConfigValue()', () => {
    it('returns the configured value when set', () => {
      const config = { paths: { plans: 'docs/plans' } };
      assert.equal(resolveConfigValue(config, 'paths.plans', FAKE_ROOT), 'docs/plans');
    });

    it('falls back to a literal default when unset', () => {
      assert.equal(resolveConfigValue({}, 'paths.plans', FAKE_ROOT), 'plans');
    });

    it('never mutates or writes back to the config object', () => {
      const config = {};
      resolveConfigValue(config, 'paths.plans', FAKE_ROOT);
      assert.deepEqual(config, {});
    });

    it('throws for an unknown field with no default', () => {
      assert.throws(() => resolveConfigValue({}, 'not_a_real_field', FAKE_ROOT), /Unknown/);
    });

    describe('derived defaults', () => {
      it('paths.decisions defaults to "{resolved paths.knowledge}/decisions"', () => {
        assert.equal(resolveConfigValue({}, 'paths.decisions', FAKE_ROOT), 'knowledge/decisions');
      });

      it('a configured paths.knowledge shifts the paths.decisions default with it', () => {
        const config = { paths: { knowledge: 'notes' } };
        assert.equal(resolveConfigValue(config, 'paths.decisions', FAKE_ROOT), 'notes/decisions');
      });

      it('an explicit paths.decisions overrides the derived default entirely', () => {
        const config = { paths: { knowledge: 'notes', decisions: 'archive/decisions' } };
        assert.equal(resolveConfigValue(config, 'paths.decisions', FAKE_ROOT), 'archive/decisions');
      });

      it('paths.features nests under the resolved paths.plans', () => {
        const config = { paths: { plans: 'docs/plans' } };
        assert.equal(
          resolveConfigValue(config, 'paths.features', FAKE_ROOT),
          'docs/plans/features',
        );
      });

      it('an explicit paths.features overrides its nested default entirely', () => {
        const config = { paths: { plans: 'docs/plans', features: 'roadmap/features' } };
        assert.equal(resolveConfigValue(config, 'paths.features', FAKE_ROOT), 'roadmap/features');
      });

      it('paths.architecture and paths.research nest under the resolved paths.knowledge', () => {
        const config = { paths: { knowledge: 'notes' } };
        assert.equal(
          resolveConfigValue(config, 'paths.architecture', FAKE_ROOT),
          'notes/architecture',
        );
        assert.equal(resolveConfigValue(config, 'paths.research', FAKE_ROOT), 'notes/research');
      });

      it('project_shortname defaults to the resolved project_name', () => {
        const config = { project_name: 'Widget' };
        assert.equal(resolveConfigValue(config, 'project_shortname', FAKE_ROOT), 'Widget');
      });

      it('project_name defaults to the project root directory name', () => {
        assert.equal(resolveConfigValue({}, 'project_name', FAKE_ROOT), basename(FAKE_ROOT));
      });

      it('paths.worktrees defaults using the resolved project_shortname', () => {
        const config = { project_shortname: 'wid' };
        assert.equal(resolveConfigValue(config, 'paths.worktrees', FAKE_ROOT), '../worktrees/wid');
      });
    });

    describe('{key.path} references in configured values', () => {
      it('substitutes a reference to another configured field', () => {
        const config = { paths: { plans: 'docs/plans', features: '{paths.plans}/features' } };
        assert.equal(
          resolveConfigValue(config, 'paths.features', FAKE_ROOT),
          'docs/plans/features',
        );
      });

      it('substitutes a reference to another field default', () => {
        const config = { paths: { features: '{paths.plans}/features' } };
        assert.equal(resolveConfigValue(config, 'paths.features', FAKE_ROOT), 'plans/features');
      });

      it('resolves multiple references in one value', () => {
        const config = {
          paths: {
            plans: 'docs/plans',
            knowledge: 'docs/knowledge',
            shared: '{paths.plans}+{paths.knowledge}',
          },
        };
        assert.equal(
          resolveConfigValue(config, 'paths.shared', FAKE_ROOT),
          'docs/plans+docs/knowledge',
        );
      });

      it('resolves a reference that itself contains a reference', () => {
        const config = {
          paths: {
            plans: 'docs/plans',
            features: '{paths.plans}/features',
            spikes: '{paths.features}/spikes',
          },
        };
        assert.equal(
          resolveConfigValue(config, 'paths.spikes', FAKE_ROOT),
          'docs/plans/features/spikes',
        );
      });

      it('throws for a direct self-reference', () => {
        const config = { paths: { plans: '{paths.plans}/x' } };
        assert.throws(() => resolveConfigValue(config, 'paths.plans', FAKE_ROOT), /Circular/);
      });

      it('throws for an indirect cycle', () => {
        const config = { paths: { plans: '{paths.epics}', epics: '{paths.plans}' } };
        assert.throws(() => resolveConfigValue(config, 'paths.plans', FAKE_ROOT), /Circular/);
      });

      it('throws when a configured override creates a cycle through a derived default', () => {
        // paths.decisions defaults to nesting under paths.knowledge; pointing
        // paths.knowledge back at paths.decisions closes the loop.
        const config = { paths: { knowledge: '{paths.decisions}' } };
        assert.throws(() => resolveConfigValue(config, 'paths.decisions', FAKE_ROOT), /Circular/);
      });

      it('propagates an unknown field referenced inside a placeholder', () => {
        const config = { paths: { features: '{paths.not_a_real_field}' } };
        assert.throws(() => resolveConfigValue(config, 'paths.features', FAKE_ROOT), /Unknown/);
      });
    });
  });
});
