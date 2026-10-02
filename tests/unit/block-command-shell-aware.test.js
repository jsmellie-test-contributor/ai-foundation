// ------------------------------
// block-command-shell-aware.test.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-007
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Unit tests for the shell-aware block-command matcher: bypass classes,
 * false-positive guards, dynamic command words, env-var allowances,
 * secrets-manager wrappers, identity-changing raw git, and robustness.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkCommand,
  matchesBlockedCommand,
  DYNAMIC_WORD_REASON,
  globToRegex,
} from '../../lib/harnesses/assets/block-command/logic.js';

const PATTERNS = ['git *', 'gh *'];

/**
 * Assert each command is blocked by a pattern.
 * @param {string[]} commands
 * @param {object} [options]
 */
function assertBlocked(commands, options) {
  for (const cmd of commands) {
    const r = checkCommand(cmd, PATTERNS, options);
    assert.ok(
      r && r.type === 'pattern',
      `expected pattern block for: ${JSON.stringify(cmd)} got ${JSON.stringify(r)}`,
    );
  }
}

/**
 * Assert each command is allowed.
 * @param {string[]} commands
 * @param {object} [options]
 */
function assertAllowed(commands, options) {
  for (const cmd of commands) {
    const r = checkCommand(cmd, PATTERNS, options);
    assert.equal(r, null, `expected allow for: ${JSON.stringify(cmd)} got ${JSON.stringify(r)}`);
  }
}

describe('unit: block-command shell-aware / bypass classes', () => {
  it('blocks baseline commands', () => {
    assertBlocked(['git status', 'git -C /repo commit -m x', 'gh pr list']);
  });

  it('blocks compound commands', () => {
    assertBlocked([
      'cd /repo && git add -A',
      'cd /repo; git commit -m x',
      'true || git push',
      'sleep 1 & git log',
    ]);
  });

  it('blocks pipes', () => {
    assertBlocked(['echo hi | git apply', 'echo hi |& git apply', 'echo x | xargs git log']);
  });

  it('blocks subshells and groups', () => {
    assertBlocked(['(git push)', '{ git push; }', '( cd x && git push )']);
  });

  it('blocks control flow bodies', () => {
    assertBlocked([
      'if true; then git log; fi',
      'for i in 1; do git log; done',
      'while true; do git log; done',
      'if git log; then echo ok; fi',
      'case x in x) git log;; esac',
      'case x in\n  a|b) echo hi ;;\n  *) git log ;;\nesac',
    ]);
  });

  it('blocks env-var prefixes', () => {
    assertBlocked(['GIT_DIR=. git log', 'FOO=1 BAR=2 git log', 'FOO="a b" git log']);
  });

  it('blocks absolute and relative paths', () => {
    assertBlocked(['/usr/bin/git status', './git status', '../bin/gh pr list']);
  });

  it('blocks wrappers', () => {
    assertBlocked([
      'env git log',
      'env -i FOO=1 git log',
      'env -u FOO git log',
      'command git log',
      'builtin git log',
      'exec git log',
      'nohup git log',
      'time git log',
      'time -p git log',
      'sudo git log',
      'sudo -u root git log',
      'nice -n 5 git log',
      'nice -5 git log',
      'ionice -c 3 git log',
      'timeout 5 git log',
      'timeout -k 1 5 git log',
      'stdbuf -oL git log',
      'setsid git log',
      'flock /tmp/l git log',
      'flock -w 5 /tmp/l git log',
      'flock /tmp/l -c "git log"',
      'taskset 0x1 git log',
      'nohup nice sudo env X=1 git log',
      'watch -n 2 git log',
    ]);
  });

  it('blocks shell re-entry', () => {
    assertBlocked([
      "bash -c 'git log'",
      'sh -c "git commit -m x"',
      'bash -lc "git log"',
      'bash -c "cd x && git log"',
      'sh -c \'sh -c "git log"\'',
      'eval "git log"',
      'eval git log',
    ]);
  });

  it('blocks xargs and find -exec', () => {
    assertBlocked([
      'xargs git log <<< x',
      'xargs -n1 git log',
      'xargs -I {} git log {}',
      'find . -name x -exec git log \\;',
      'find . -name x -exec git log {} +',
      'find . -execdir gh pr list \\;',
    ]);
  });

  it('blocks command and process substitution', () => {
    assertBlocked([
      'echo $(git log)',
      'echo `git log`',
      'echo "$(git log)"',
      'cat <(git log)',
      'diff <(git log) <(echo x)',
      'x=$(git log)',
      'echo "a `git log` b"',
      'echo ${x:-$(git log)}',
      'echo $(( $(git log | wc -l) + 1 ))',
    ]);
  });

  it('blocks quoting and escaping of the command word', () => {
    assertBlocked([
      '"git" log',
      "'git' log",
      '\\git log',
      'gi""t log',
      "g'i't log",
      '"/usr/bin/git" log',
    ]);
  });

  it('blocks heredoc then git', () => {
    assertBlocked([
      'cat <<EOF\nhi\nEOF\ngit push',
      "cat <<'EOF'\nhi\nEOF\ngit push",
      'cat <<-EOF\n\thi\n\tEOF\ngit push',
    ]);
  });

  it('blocks multi-line input (newlines)', () => {
    assertBlocked([
      'git commit -m "a\nb"',
      'git log\necho x',
      'echo x\ngit log',
      'git commit -m "$(cat <<\'EOF\'\nmsg\nEOF\n)"',
      'git commit -m "$(cat <<EOF\nmsg\nEOF\n)"',
      'git log\r\necho x',
      'echo a \\\n  && git log',
    ]);
  });

  it('blocks a bare command and whitespace forms', () => {
    assertBlocked([
      'git',
      'gh',
      'git\tlog',
      ' git log',
      '\tgit log',
      'git\nlog',
      '  git  ',
      'git;',
      'echo x;git',
    ]);
  });

  it('blocks redirections around a blocked command', () => {
    assertBlocked([
      'git log > out.txt',
      '2>/dev/null git log',
      'git log 2>&1 | head',
      '>out git log',
      'git log &> out',
    ]);
  });

  it('blocks the prototype known cases', () => {
    assertBlocked([
      'flock /tmp/l git log',
      '$(git log)',
      'cat <<EOF\n$(git log)\nEOF',
      'cat <<EOF\n`git log`\nEOF',
    ]);
    assertAllowed(['command -v git']);
  });

  it('matches a trailing " *" pattern against the bare command', () => {
    assert.equal(matchesBlockedCommand('git', ['git *']), 'git *');
    assert.equal(matchesBlockedCommand('gitx', ['git *']), null);
  });

  it('globToRegex matches across newlines', () => {
    assert.ok(globToRegex('git *').test('git commit -m a\nb'));
  });

  it('applies non-glob patterns to normalized commands too', () => {
    assert.equal(matchesBlockedCommand('cd x && rm -rf /tmp/y', ['rm -rf *']), 'rm -rf *');
    assert.equal(matchesBlockedCommand('ls', ['ls']), 'ls');
  });
});

describe('unit: block-command shell-aware / false-positive guards', () => {
  it('allows commands that only mention a blocked word', () => {
    assertAllowed([
      'echo "git status"',
      "echo 'git push'",
      'grep git README.md',
      'ls | grep git',
      'cat .gitignore',
      'git-lfs ls-files',
      'git_helper',
      'which git',
      'type git',
      'command -v git',
      'command -V git',
      'man git',
      'FOO=git echo $FOO',
      '# git push',
      'echo hi # git push',
      'echo "$(echo hi)"',
      'npm test && npm run build',
      'ls -la /usr/bin/git',
    ]);
  });

  it('allows ai-git in all its invocation forms', () => {
    assertAllowed([
      'ai-git status',
      'ai-git commit -m "git push fixed"',
      '/opt/node22/bin/ai-git push',
      'node /opt/x/bin/ai-git.js push',
      'node ../ai-git.js commit -m "git push"',
      'ai-git gh-pr-create --draft',
    ]);
  });

  it('does not match text inside heredoc bodies', () => {
    assertAllowed([
      "cat <<'EOF'\ngit push\n$(git log)\nEOF",
      'cat <<EOF\ngit push\nEOF',
      'cat <<EOF > notes.md\nrun git push then gh pr create\nEOF',
      'cat <<"EOF"\n$(git log)\nEOF',
      'cat <<\\EOF\n$(git log)\nEOF',
    ]);
  });

  it('does not match case patterns, for-lists or [[ ]] contents', () => {
    assertAllowed([
      'case $x in git) echo hi;; esac',
      'for x in git gh; do echo $x; done',
      '[[ -f x && -d y ]] && echo ok',
      '[ -f x ] && echo ok',
    ]);
  });

  it('does not treat quoted separators as command separators', () => {
    assertAllowed(['echo "a && git log"', 'echo \\; git log', 'echo "; git"']);
  });
});

describe('unit: block-command shell-aware / dynamic command words', () => {
  const dynamic = [
    '$g log',
    '"$GIT" log',
    '${cmd} x',
    '$(echo git) log',
    '`x` log',
    '/usr/bin/$x',
    'eval $x',
    'eval "git $x"',
    '/usr/bin/g?t log',
    '{git,x} log',
    '/usr/bin/g*t',
    "$'\\x67it' log",
    'g=git; $g log',
    'GIT=/usr/bin/git; $GIT log',
    'bash -c "$x"',
    'sudo $x',
    'env $x log',
    'echo hi | $x',
    'git{,x} log',
  ];

  it('blocks each dynamic command word with the dynamic reason', () => {
    for (const cmd of dynamic) {
      const r = checkCommand(cmd, PATTERNS);
      assert.ok(r, `expected block for ${JSON.stringify(cmd)}`);
      assert.ok(r.type === 'dynamic' || r.type === 'pattern', cmd);
    }
    for (const cmd of [
      '$g log',
      '"$GIT" log',
      '${cmd} x',
      '/usr/bin/$x',
      'eval $x',
      '/usr/bin/g?t log',
      '{git,x} log',
      'g=git; $g log',
    ]) {
      const r = checkCommand(cmd, PATTERNS);
      assert.equal(r.type, 'dynamic', cmd);
      assert.ok(r.word.length > 0);
    }
  });

  it('matchesBlockedCommand returns the dynamic reason string', () => {
    assert.equal(matchesBlockedCommand('$g log', PATTERNS), DYNAMIC_WORD_REASON);
  });

  it('does not block dynamic words for an agent with no usable patterns', () => {
    assert.equal(checkCommand('$g log', []), null);
    assert.equal(checkCommand('$g log', [null, '']), null);
  });
});

describe('unit: block-command shell-aware / env-var allowances', () => {
  it('allows env injection and variable-prefixed literal paths', () => {
    assertAllowed([
      'GIT_AUTHOR_NAME=x npm test',
      'env FOO=bar npm test',
      'export FOO=bar && npm test',
      'export FOO=bar',
      '$HOME/.local/bin/tool',
      '"$PWD/node_modules/.bin/eslint" .',
      '${CLAUDE_PROJECT_DIR}/scripts/x.sh',
      'echo $FOO',
      'FOO=$(echo x) npm test',
      'arr=(a b c)',
      'node "$HOME/x.js" $ARG',
      'x=1',
    ]);
  });

  it('still blocks raw git carrying env assignments', () => {
    assertBlocked([
      'GIT_AUTHOR_NAME=x git commit -m m',
      'export X=1 && git log',
      'env GIT_DIR=. git log',
    ]);
  });
});

describe('unit: block-command shell-aware / identity-changing raw git', () => {
  it('blocks -c user.name / user.email forms', () => {
    assertBlocked([
      'git -c user.name=x -c user.email=y commit -m m',
      'git -c user.name="A B" -c user.email=a@b.c commit --allow-empty -m m',
      'GIT_AUTHOR_NAME=x GIT_AUTHOR_EMAIL=y git commit -m m',
      'GIT_AUTHOR_NAME=x git commit -m m',
      'GIT_COMMITTER_NAME=x GIT_COMMITTER_EMAIL=y git commit -m m',
      'env GIT_AUTHOR_NAME=x git commit -m m',
      'git config user.name x',
      'git commit --author="A <a@b.c>" -m m',
    ]);
  });
});

describe('unit: block-command shell-aware / secrets-manager run wrappers', () => {
  it('blocks raw git/gh behind built-in secrets wrappers', () => {
    assertBlocked([
      'bws run -- git log',
      'bws run --project-id abc -- git log',
      'bws run --project-id "$BWS_PROJECT_ID" -- git log',
      'bws run -- gh pr list',
      'op run -- git log',
      'op run --env-file .env -- git log',
      'doppler run -- git log',
      'doppler run -p proj -c dev -- git log',
      'doppler run --command "git log"',
      'bws run "git log"',
      'bws run -- bash -c "git log"',
    ]);
  });

  it('allows ai-git behind built-in secrets wrappers', () => {
    assertAllowed([
      'bws run -- ai-git push',
      'bws run --project-id abc -- ai-git push',
      'op run -- ai-git push',
      'doppler run -- ai-git push',
      'bws secret list',
      'bws run -- npm test',
    ]);
  });

  it('honours the configured secrets.run prefix', () => {
    const secretsRun = ['bws', 'run', '--project-id', '${BWS_PROJECT_ID}', '--'];
    assertBlocked(
      ['bws run --project-id xyz -- git log', 'bws run --project-id xyz -- gh pr list'],
      { secretsRun },
    );
    assertAllowed(['bws run --project-id xyz -- ai-git push'], { secretsRun });
  });

  it('honours a custom secrets.run prefix for an unknown tool', () => {
    const secretsRun = ['vault-exec', '--env', 'prod', '--'];
    assertBlocked(
      ['vault-exec --env prod -- git log', '/usr/local/bin/vault-exec --env prod -- gh pr list'],
      { secretsRun },
    );
    assertAllowed(['vault-exec --env prod -- ai-git push', 'vault-exec --env prod -- npm test'], {
      secretsRun,
    });
    // Without the configured prefix the unknown wrapper is not understood.
    assertAllowed(['vault-exec --env prod -- git log']);
  });
});

describe('unit: block-command shell-aware / known residual gaps (documented)', () => {
  it('allows interpreters, build tools, and piping into a shell', () => {
    assertAllowed([
      "python3 -c \"import subprocess; subprocess.run(['git','log'])\"",
      "node -e \"require('child_process').execSync('git log')\"",
      'make',
      'npm run x',
      "printf 'git log' | sh",
      'bash <(echo git log)',
      './script.sh',
    ]);
  });
});

describe('unit: block-command shell-aware / robustness', () => {
  it('never throws and fails open on unbalanced or unterminated constructs', () => {
    const odd = [
      'echo "unterminated',
      "echo 'unterminated",
      'echo $(unterminated',
      'echo `unterminated',
      'echo ${unterminated',
      'echo $((1 + ',
      '(echo hi',
      'echo hi)',
      '{ echo hi',
      'cat <<EOF\ngit log\nno terminator',
      'cat <<EOF',
      'cat <<',
      'echo \\',
      'echo $',
      'a=(b c',
      'case x in a) echo',
      'if true; then',
      '[[ a',
      '>',
      '&&',
      ';;',
      'echo "$(cat <<EOF\nbody',
      '\u0000git log\u0000',
    ];
    for (const cmd of odd) {
      let result;
      assert.doesNotThrow(() => {
        result = matchesBlockedCommand(cmd, PATTERNS);
      }, cmd);
      if (!cmd.includes('git log\u0000'))
        assert.equal(result, null, `expected fail-open for ${JSON.stringify(cmd)}`);
    }
  });

  it('treats unbalanced input leniently without hiding a leading blocked command', () => {
    assertBlocked(['git log "unterminated', 'git log $(unterminated']);
  });

  it('returns null for an empty or whitespace command', () => {
    assert.equal(matchesBlockedCommand('   \n\t ', PATTERNS), null);
    assert.equal(matchesBlockedCommand('', PATTERNS), null);
  });

  it('stops descending beyond the nesting limit but still checks earlier commands', () => {
    const deep = `${'echo $('.repeat(200)}x${')'.repeat(200)}`;
    let result;
    assert.doesNotThrow(() => {
      result = matchesBlockedCommand(`git log && ${deep}`, PATTERNS);
    });
    assert.equal(result, 'git *');
    assert.doesNotThrow(() => matchesBlockedCommand(deep, PATTERNS));
    assert.doesNotThrow(() => matchesBlockedCommand('bash -c "'.repeat(40) + 'echo x', PATTERNS));
  });

  it('handles long input in linear time', () => {
    const inputs = [
      `echo ${'a '.repeat(100000)}`,
      `${'echo x && '.repeat(20000)}echo done`,
      `${'echo "x" '.repeat(20000)}`,
      `echo ${'$x'.repeat(50000)}`,
      `cat <<EOF\n${'line git\n'.repeat(50000)}EOF`,
      `${'('.repeat(50000)}`,
      `${'"'.repeat(100001)}`,
      `echo ${'`'.repeat(20001)}`,
      `echo ${'\\ '.repeat(50000)}`,
    ];
    for (const cmd of inputs) {
      const start = Date.now();
      assert.equal(matchesBlockedCommand(cmd, PATTERNS), null);
      assert.ok(
        Date.now() - start < 3000,
        `too slow (${Date.now() - start}ms) for input starting ${cmd.slice(0, 20)}`,
      );
    }
    const start = Date.now();
    assert.equal(matchesBlockedCommand(`${'echo x && '.repeat(20000)}git log`, PATTERNS), 'git *');
    assert.ok(Date.now() - start < 3000);
  });
});
