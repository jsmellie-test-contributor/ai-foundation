/**
 * Tests for .github/scripts/cleanup-branches.mjs: the pure classification
 * rules, the name-safety checks, and the sweep / list flows against an
 * in-memory fake of the GitHub REST API.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SCRIPT = pathToFileURL(
  resolve(import.meta.dirname, '../../.github/scripts/cleanup-branches.mjs'),
).href;
const {
  classify,
  createApi,
  isPlainBranchName,
  parseBranchList,
  renderSummary,
  run,
  runList,
  runSweep,
} = await import(SCRIPT);

const NOW = new Date('2026-10-04T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000 - 60_000);
const CFG = {
  defaultBranch: 'main',
  protectedBranches: ['cloud-sandbox', 'agent-testing', 'docs'],
  activeDays: 7,
  archiveDays: 14,
};

function facts(overrides) {
  return {
    name: 'feature/x',
    lastCommit: daysAgo(1),
    ahead: 3,
    openPr: null,
    merged: false,
    ...overrides,
  };
}
const pr = (number, ageDays, labels = []) => ({ number, createdAt: daysAgo(ageDays), labels });

describe('classify', () => {
  const cases = [
    ['default branch', { name: 'main' }, 'Mandatory', /default/],
    [
      'protected branch, however old',
      { name: 'docs', lastCommit: daysAgo(900) },
      'Mandatory',
      /protected/,
    ],
    [
      'merged PR, even when brand new',
      { merged: true, lastCommit: daysAgo(0) },
      'Archive',
      /merged/,
    ],
    [
      'push-check branch contained in main',
      { name: 'push-check/x', ahead: 0 },
      'Archive',
      /push-check/,
    ],
    [
      'empty non-push-check branch is kept',
      { name: 'claude/new', ahead: 0, lastCommit: daysAgo(90) },
      'Mandatory',
      /empty/,
    ],
    ['commit 2 days ago', { lastCommit: daysAgo(2) }, 'Active', /2d/],
    ['commit 6 days ago is still Active', { lastCommit: daysAgo(6) }, 'Active', /6d/],
    ['commit 7 days ago is Stale', { lastCommit: daysAgo(7) }, 'Stale', /7d/],
    ['commit 14 days ago is still Stale', { lastCommit: daysAgo(14) }, 'Stale', /14d/],
    ['commit 15 days ago, no PR, is Archive', { lastCommit: daysAgo(15) }, 'Archive', /15d/],
    [
      'young open PR keeps an old branch Active',
      { lastCommit: daysAgo(30), openPr: pr(5, 3) },
      'Active',
      /PR #5/,
    ],
    ['open PR 7 days old is Stale', { lastCommit: daysAgo(8), openPr: pr(6, 7) }, 'Stale', /PR #6/],
    [
      'old PR plus very old commit is Stale first, never Archive',
      { lastCommit: daysAgo(60), openPr: pr(7, 40) },
      'Stale',
      /PR #7/,
    ],
    [
      'PR reopened after being marked stale stays Active',
      { lastCommit: daysAgo(60), openPr: pr(8, 40, ['stale']) },
      'Active',
      /reopened/,
    ],
    [
      'unrelated history ages out like any other branch',
      { name: 'e-test/20261001-002928', ahead: null, lastCommit: daysAgo(30) },
      'Archive',
      /30d/,
    ],
  ];
  for (const [title, overrides, category, reason] of cases) {
    it(title, () => {
      const verdict = classify(facts(overrides), CFG, NOW);
      assert.equal(verdict.category, category);
      assert.match(verdict.reason, reason);
    });
  }

  it('never archives a branch that has an open PR', () => {
    for (const age of [0, 5, 8, 20, 400]) {
      for (const commit of [0, 8, 20, 400]) {
        const v = classify(facts({ lastCommit: daysAgo(commit), openPr: pr(1, age) }), CFG, NOW);
        assert.notEqual(v.category, 'Archive', `PR ${age}d, commit ${commit}d`);
      }
    }
  });
});

describe('isPlainBranchName', () => {
  it('accepts ordinary branch names', () => {
    for (const n of [
      'claude/old',
      'AIF-010/004-agent-tool-grants',
      'e-test/20261001-002928',
      'a_b.c',
    ]) {
      assert.equal(isPlainBranchName(n), true, n);
    }
  });
  it('rejects names that could escape refs/heads or are invalid for git', () => {
    for (const n of [
      '../x',
      '../tags/v1',
      'a..b',
      'a//b',
      'a/',
      'a.lock',
      '.hidden',
      '-f',
      '$(id)',
      '*',
      'a b',
      '',
    ]) {
      assert.equal(isPlainBranchName(n), false, JSON.stringify(n));
    }
  });
});

describe('parseBranchList', () => {
  it('splits on commas and whitespace and drops refs/heads/', () => {
    assert.deepEqual(parseBranchList('a, b\nrefs/heads/c  d,,'), ['a', 'b', 'c', 'd']);
    assert.deepEqual(parseBranchList(undefined), []);
    assert.deepEqual(parseBranchList('   '), []);
  });
});

/**
 * In-memory stand-in for the slice of the GitHub API the script uses.
 * `calls` records every write so tests can assert nothing happened.
 */
function fakeApi(world) {
  const calls = [];
  const byName = (name) => world.branches.find((b) => b.name === name);
  const bySha = (sha) => world.branches.find((b) => b.sha === sha);
  const err = (status, message) => Object.assign(new Error(`${status} ${message}`), { status });

  return {
    calls,
    async request(method, path, body) {
      if (method !== 'GET') {
        calls.push({ method, path, body });
        return { data: {}, headers: new Headers() };
      }
      let m;
      if (path === '/repos/o/r') return { data: { default_branch: 'main' } };
      if ((m = path.match(/^\/repos\/o\/r\/commits\/(.+)$/))) {
        const b = bySha(m[1]);
        if (!b || b.inspectFails) throw err(500, 'boom');
        return { data: { commit: { committer: { date: b.date.toISOString() } } } };
      }
      if ((m = path.match(/^\/repos\/o\/r\/compare\/main\.\.\.(\w+)\?per_page=1$/))) {
        const b = bySha(m[1]);
        if (b.compareFails) throw err(404, 'Not Found');
        if (b.ahead === null) throw err(404, 'No common ancestor between main and it');
        return { data: { ahead_by: b.ahead } };
      }
      if ((m = path.match(/^\/repos\/o\/r\/git\/ref\/heads\/(.+)$/))) {
        if (!byName(m[1])) throw err(404, 'Not Found');
        return { data: {} };
      }
      throw new Error(`unexpected GET ${path}`);
    },
    async paginate(path) {
      if (path.includes('/branches')) {
        return world.branches.map((b) => ({ name: b.name, commit: { sha: b.sha } }));
      }
      if (path.includes('state=open')) {
        return (world.openPrs ?? []).map((p) => ({
          number: p.number,
          created_at: p.createdAt.toISOString(),
          labels: (p.labels ?? []).map((name) => ({ name })),
          head: { ref: p.ref, repo: { full_name: p.repo ?? 'o/r' } },
        }));
      }
      if (path.includes('state=closed')) {
        return (world.closedPrs ?? []).map((p) => ({
          merged_at: p.merged === false ? null : '2026-10-01T00:00:00Z',
          head: { ref: p.ref, sha: p.sha, repo: { full_name: 'o/r' } },
        }));
      }
      throw new Error(`unexpected list ${path}`);
    },
  };
}

const branch = (name, sha, days, ahead = 2, extra = {}) => ({
  name,
  sha,
  date: daysAgo(days),
  ahead,
  ...extra,
});

const WORLD = () => ({
  branches: [
    branch('main', 'sha_main', 0, 0),
    branch('docs', 'sha_docs', 99, 1),
    branch('AIF-1/work', 'sha_work', 1),
    branch('claude/stale-one', 'sha_stale1', 10),
    branch('claude/stale-pr', 'sha_stalepr', 20),
    branch('claude/ancient', 'sha_ancient', 40),
    branch('claude/landed', 'sha_landed', 2),
    branch('claude/empty', 'sha_empty', 60, 0),
    branch('push-check/done', 'sha_pc', 3, 0),
    branch('e-test/20261001-002928', 'sha_etest', 30, null),
  ],
  openPrs: [
    { number: 10, ref: 'AIF-1/work', createdAt: daysAgo(1) },
    { number: 11, ref: 'claude/stale-pr', createdAt: daysAgo(12) },
  ],
  closedPrs: [
    { ref: 'claude/landed', sha: 'sha_landed' },
    { ref: 'claude/stale-one', sha: 'sha_old_tip' }, // merged, but at an earlier tip
  ],
});

describe('runSweep', () => {
  const cfg = CFG;

  it('only reports when enforce is off', async () => {
    const api = fakeApi(WORLD());
    const rows = await runSweep({ api, repo: 'o/r', cfg, enforce: false, now: NOW });
    assert.deepEqual(api.calls, []);
    const get = (name) => rows.find((r) => r.name === name);
    assert.equal(get('claude/ancient').action, 'would delete');
    assert.match(get('claude/stale-pr').action, /would close PR #11/);
  });

  it('sorts every branch except the default into the expected category', async () => {
    const api = fakeApi(WORLD());
    const rows = await runSweep({ api, repo: 'o/r', cfg, enforce: false, now: NOW });
    const cat = Object.fromEntries(rows.map((r) => [r.name, r.category]));
    assert.deepEqual(cat, {
      docs: 'Mandatory',
      'AIF-1/work': 'Active',
      'claude/stale-one': 'Stale',
      'claude/stale-pr': 'Stale',
      'claude/ancient': 'Archive',
      'claude/landed': 'Archive',
      'claude/empty': 'Mandatory',
      'push-check/done': 'Archive',
      'e-test/20261001-002928': 'Archive',
      main: 'Mandatory',
    });
  });

  it('with enforce on: deletes Archive branches, closes the stale PR, touches nothing else', async () => {
    const api = fakeApi(WORLD());
    await runSweep({ api, repo: 'o/r', cfg, enforce: true, now: NOW });
    const deleted = api.calls.filter((c) => c.method === 'DELETE').map((c) => c.path);
    assert.deepEqual(deleted.sort(), [
      '/repos/o/r/git/refs/heads/claude/ancient',
      '/repos/o/r/git/refs/heads/claude/landed',
      '/repos/o/r/git/refs/heads/e-test/20261001-002928',
      '/repos/o/r/git/refs/heads/push-check/done',
    ]);
    const paths = api.calls.map((c) => `${c.method} ${c.path}`);
    assert.ok(paths.includes('POST /repos/o/r/labels'));
    assert.ok(paths.includes('POST /repos/o/r/issues/11/labels'));
    assert.ok(paths.includes('POST /repos/o/r/issues/11/comments'));
    const closing = api.calls.find((c) => c.method === 'PATCH');
    assert.equal(closing.path, '/repos/o/r/pulls/11');
    assert.deepEqual(closing.body, { state: 'closed' });
    // The PR is closed only after it is labelled and commented on, so a
    // failure part-way leaves it open rather than closed without explanation.
    const at = (p) => paths.indexOf(p);
    assert.ok(at('POST /repos/o/r/issues/11/labels') < at('PATCH /repos/o/r/pulls/11'));
    assert.ok(at('POST /repos/o/r/issues/11/comments') < at('PATCH /repos/o/r/pulls/11'));
    assert.equal(paths.filter((p) => p.includes('/pulls/10')).length, 0);
  });

  it('a merged PR at an older tip does not condemn a reused branch name', async () => {
    const api = fakeApi(WORLD());
    const rows = await runSweep({ api, repo: 'o/r', cfg, enforce: false, now: NOW });
    assert.equal(rows.find((r) => r.name === 'claude/stale-one').category, 'Stale');
  });

  it('keeps a branch whose compare fails for any reason other than unrelated history', async () => {
    const world = WORLD();
    world.branches.find((b) => b.name === 'claude/ancient').compareFails = true;
    const api = fakeApi(world);
    const rows = await runSweep({ api, repo: 'o/r', cfg, enforce: true, now: NOW });
    const row = rows.find((r) => r.name === 'claude/ancient');
    assert.equal(row.category, 'Mandatory');
    assert.match(row.reason, /could not inspect/);
    assert.ok(!api.calls.some((c) => c.path.endsWith('claude/ancient')));
  });

  it('keeps a branch it cannot inspect', async () => {
    const world = WORLD();
    world.branches.find((b) => b.name === 'claude/ancient').inspectFails = true;
    const api = fakeApi(world);
    const rows = await runSweep({ api, repo: 'o/r', cfg, enforce: true, now: NOW });
    const row = rows.find((r) => r.name === 'claude/ancient');
    assert.equal(row.category, 'Mandatory');
    assert.match(row.reason, /could not inspect/);
    assert.ok(!api.calls.some((c) => c.path.endsWith('claude/ancient')));
  });
});

describe('runList', () => {
  const world = () => ({
    branches: [
      branch('main', 'a', 0),
      branch('claude/old', 'b', 40),
      branch('docs', 'c', 40),
      branch('AIF-1/w', 'd', 1),
    ],
    openPrs: [{ number: 1, ref: 'AIF-1/w', createdAt: daysAgo(1) }],
  });
  const names = ['claude/old', 'main', 'docs', 'AIF-1/w', '../x', 'ghost'];

  it('deletes only the plain, unprotected, PR-free branches that exist', async () => {
    const api = fakeApi(world());
    const rows = await runList({ api, repo: 'o/r', cfg: CFG, names, dryRun: false });
    const action = Object.fromEntries(rows.map((r) => [r.name, r.action]));
    assert.equal(action['claude/old'], 'deleted');
    assert.match(action.main, /REFUSED/);
    assert.match(action.docs, /REFUSED/);
    assert.match(action['AIF-1/w'], /REFUSED: open PR #1/);
    assert.match(action['../x'], /REFUSED: not a plain branch name/);
    assert.match(action.ghost, /does not exist/);
    assert.deepEqual(
      api.calls.map((c) => `${c.method} ${c.path}`),
      ['DELETE /repos/o/r/git/refs/heads/claude/old'],
    );
  });

  it('deletes nothing on a dry run', async () => {
    const api = fakeApi(world());
    const rows = await runList({ api, repo: 'o/r', cfg: CFG, names: ['claude/old'], dryRun: true });
    assert.equal(rows[0].action, 'would delete');
    assert.deepEqual(api.calls, []);
  });
});

describe('run', () => {
  const env = { REPO: 'o/r', PROTECTED_BRANCHES: 'cloud-sandbox agent-testing docs' };

  it('reports only by default (ENFORCE unset)', async () => {
    const api = fakeApi(WORLD());
    const { summary, failed } = await run(env, api, { now: NOW });
    assert.deepEqual(api.calls, []);
    assert.equal(failed, false);
    assert.match(summary, /report only, nothing changed/);
  });

  it('DRY_RUN overrides ENFORCE', async () => {
    const api = fakeApi(WORLD());
    await run({ ...env, ENFORCE: 'true', DRY_RUN: 'true' }, api, { now: NOW });
    assert.deepEqual(api.calls, []);
  });

  it('acts when ENFORCE is true', async () => {
    const api = fakeApi(WORLD());
    await run({ ...env, ENFORCE: 'true' }, api, { now: NOW });
    assert.ok(api.calls.some((c) => c.method === 'DELETE'));
  });

  it('BRANCHES switches to list mode, which does not need ENFORCE', async () => {
    const api = fakeApi(WORLD());
    const { rows, failed } = await run({ ...env, BRANCHES: 'claude/ancient main' }, api, {
      now: NOW,
    });
    assert.deepEqual(
      rows.map((r) => r.action.split(':')[0]),
      ['deleted', 'REFUSED'],
    );
    assert.equal(failed, true);
  });

  it('requires REPO', async () => {
    await assert.rejects(() => run({}, fakeApi(WORLD())), /REPO is required/);
  });
});

describe('renderSummary', () => {
  it('lists Stale branches in their own section and counts categories', async () => {
    const api = fakeApi(WORLD());
    const rows = await runSweep({ api, repo: 'o/r', cfg: CFG, enforce: false, now: NOW });
    const md = renderSummary(rows, { mode: 'sweep', enforce: false });
    assert.match(
      md,
      /### Stale branches\n\n- `claude\/stale-one` — last commit 10d ago\n- `claude\/stale-pr` — PR #11 open 12d/,
    );
    assert.match(md, /\*\*Stale\*\* 2/);
    assert.match(md, /\| `claude\/ancient` \| Archive \|/);
  });
});

describe('createApi', () => {
  const reply = (status, body, headers = {}) => ({
    ok: status < 400,
    status,
    headers: new Headers(headers),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  });

  it('follows Link rel="next" across pages and sends auth', async () => {
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push({ url, auth: init.headers.authorization });
      return url.endsWith('page=2')
        ? reply(200, [{ n: 3 }])
        : reply(200, [{ n: 1 }, { n: 2 }], {
            link: '<https://api.test/list?page=2>; rel="next", <https://api.test/list?page=2>; rel="last"',
          });
    };
    const api = createApi({ token: 't0k', fetchImpl, base: 'https://api.test' });
    assert.deepEqual(await api.paginate('/list'), [{ n: 1 }, { n: 2 }, { n: 3 }]);
    assert.deepEqual(
      seen.map((s) => s.url),
      ['https://api.test/list', 'https://api.test/list?page=2'],
    );
    assert.ok(seen.every((s) => s.auth === 'Bearer t0k'));
  });

  it('throws with the status on an error response, JSON or not', async () => {
    const api = createApi({
      token: 't',
      base: 'https://api.test',
      fetchImpl: async (url) =>
        url.endsWith('/json')
          ? reply(404, { message: 'Not Found' })
          : reply(502, '<html>bad gateway</html>'),
    });
    await assert.rejects(
      () => api.request('GET', '/json'),
      (err) => err.status === 404 && /Not Found/.test(err.message),
    );
    await assert.rejects(
      () => api.request('GET', '/html'),
      (err) => err.status === 502 && /bad gateway/.test(err.message),
    );
  });

  it('stops after maxPages so a bad Link header cannot loop forever', async () => {
    const api = createApi({
      token: 't',
      base: 'https://api.test',
      fetchImpl: async () => reply(200, [1], { link: '<https://api.test/list>; rel="next"' }),
    });
    assert.equal((await api.paginate('/list', 3)).length, 3);
  });
});
