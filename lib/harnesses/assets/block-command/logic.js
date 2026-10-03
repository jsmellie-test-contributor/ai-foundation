// ------------------------------
// logic.js
//
// Author: Starvoxel AI Agent - 2026-10-02
// Plan: AIF-007
//
// Copyright (c) StarVoxel. All rights reserved.
// ------------------------------

/**
 * Pure logic for matching shell commands against blocked_commands glob patterns.
 * No I/O — shared by the PreToolUse hook CLI (cli.js) and unit tests.
 *
 * A command line is split into simple commands by a best-effort, dependency-free
 * shell tokenizer; each simple command is normalized (leading assignments,
 * wrappers, path prefix, quoting) and tested against every pattern. This is
 * workflow discipline, NOT a security boundary. Known residual gaps that cannot
 * be closed by inspecting command text: interpreters that call the blocked tool
 * internally (`python -c`, `node -e`), scripts and build tools (`make`,
 * `npm run x`), shell functions/aliases defined in earlier commands, piping a
 * script into a shell (`printf 'git log' | sh`), and process-substitution
 * scripts (`bash <(echo git log)`). Dynamic command words are blocked instead.
 *
 * Failure behaviour: the parser never throws on odd input. Unbalanced
 * constructs are treated as literal text; constructs nested beyond the parser's
 * limits stop parsing at that point (commands already parsed are still checked);
 * any internal error makes the check fail open (null).
 */

// A NUL byte stands in for every expansion we cannot resolve statically
// ($VAR, $(cmd), `cmd`, ${...}, <(cmd)). NUL cannot appear in a real command
// line, and checkCommand strips any that do, so input can never forge a marker.
/** Marks an unresolvable expansion inside a word's text. */
const DYN = '\u0000';

// Both limits bound attacker-controlled recursion (deeply nested `$(...)` or
// `bash -c 'bash -c ...'`) so a hostile line cannot overflow the stack or hang
// the hook; hitting either one is handled quietly rather than as an error.
/** Maximum nesting of substitutions / sub-parsers before the parser stops descending. */
const MAX_NEST = 64;

/** Maximum recursion through `bash -c`, `eval`, wrappers and similar re-entry. */
const MAX_EXPAND_DEPTH = 16;

/** Reason string returned by `matchesBlockedCommand` for a dynamic command word. */
export const DYNAMIC_WORD_REASON = 'dynamic command word';

/** Thrown internally when nesting exceeds the parser's limits. */
class ParseLimit extends Error {}

/**
 * @typedef {object} Word
 * @property {string} text - Word text with quoting removed; each unresolvable expansion is one DYN char
 * @property {boolean} quoted - True when any quoting or escaping appeared in the word
 * @property {boolean} isAssign - True for an unquoted `NAME=value` word
 * @property {number[]} globAt - Indexes into `text` of unquoted glob/brace-expansion characters
 */

// ---------------------------------------------------------------------------
// Glob matching
// ---------------------------------------------------------------------------

/**
 * Convert a glob pattern (using `*` as a wildcard matching any sequence of
 * characters, including none and newlines) into a RegExp anchored to the full
 * string. All other regex-special characters in the pattern are escaped literally.
 * @param {string} pattern
 * @returns {RegExp}
 */
export function globToRegex(pattern) {
  const specials = /[.+^${}()|[\]\\]/g;
  const escaped = pattern.replace(specials, '\\$&');
  // Split/join rather than replace so only the literal `*` becomes a wildcard;
  // the 's' flag below lets `.` span newlines, since commands can be multi-line.
  const regexStr = escaped.split('*').join('.*');
  return new RegExp(`^${regexStr}$`, 's');
}

/**
 * Test one normalized simple command against one glob pattern. A trailing
 * ` *` additionally matches the bare command (`git *` matches `git`).
 * @param {string} pattern
 * @param {string} normalized
 * @returns {boolean}
 */
function patternMatches(pattern, normalized) {
  // A trailing " *" means "with any arguments", which must also cover the
  // bare command: `git *` has to block plain `git` (no args) too.
  if (globToRegex(pattern).test(normalized)) return true;
  return pattern.endsWith(' *') && globToRegex(pattern.slice(0, -2)).test(normalized);
}

// ---------------------------------------------------------------------------
// Lexer / parser: command line -> simple commands (lists of words)
// ---------------------------------------------------------------------------

// Valid variable name (optionally with `+` for `NAME+=value`), used to tell
// `FOO=bar cmd` assignments from ordinary words.
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*\+?$/;
// Operators whose next word is a redirection target / heredoc delimiter, not
// part of the command's argument list.
const REDIRECT_OPS = new Set([
  '<',
  '>',
  '>>',
  '>&',
  '<&',
  '<>',
  '>|',
  '&>',
  '&>>',
  '<<<',
  '<<',
  '<<-',
]);
// Reserved words that only introduce or close a construct. They are dropped at
// the start of a command so `if x; then git log; fi` still checks `git log`.
// `for`, `select` and `case` are handled separately in parseSequence.
const KEYWORDS = new Set([
  'if',
  'then',
  'elif',
  'else',
  'fi',
  'while',
  'until',
  'do',
  'done',
  '!',
  '{',
  '}',
]);

/**
 * Build an empty word record.
 * @returns {Word}
 */
function emptyWord() {
  return { text: '', quoted: false, isAssign: false, globAt: [] };
}

/** Best-effort shell tokenizer; appends each simple command it finds to `out`. */
class Parser {
  /**
   * @param {string} src - Source text
   * @param {number} depth - Sub-parser depth (backticks, heredoc bodies)
   * @param {Word[][]} out - Shared output list of simple commands
   */
  constructor(src, depth, out) {
    if (depth > MAX_NEST) throw new ParseLimit();
    this.src = src;
    this.pos = 0;
    this.depth = depth;
    this.nest = 0;
    this.out = out;
    this.pending = [];
  }

  // Overall approach: a single forward pass that tracks a few flags describing
  // the construct we are inside (case pattern lists, `[[ ]]`, `for` heads) and
  // emits one word list per simple command. It deliberately does not build a full
  // shell AST; anything it cannot classify is treated as literal text, so the worst
  // case is a missed or extra match, never a crash.
  /**
   * Parse commands until EOF, or (when `isSub`) the unmatched closing paren.
   * @param {boolean} isSub
   */
  parseSequence(isSub) {
    // State for the simple command currently being collected.
    let words = [];
    // Set for heads whose words are not an executable command (`for x in a b`,
    // `case $x`): the list is dropped on flush, but substitutions inside it were
    // already parsed into `out` as a side effect and are still checked.
    let discard = false;
    let caseHead = false;
    // Inside `[[ ... ]]`, where `&&`, `||`, `(`, `)`, `<`, `>` are conditional
    // operators rather than command separators or redirections.
    let dblBracket = false;
    // Nesting of plain `( ... )` subshells inside a `$(...)` body, so only the
    // paren that closes the substitution itself ends this sequence.
    let parenDepth = 0;
    // `case` bookkeeping: depth of open `case ... in`, and whether we are reading a
    // pattern list (`a|b)`) whose leading words are patterns, not commands.
    let caseDepth = 0;
    let patternMode = false;
    // Pending redirection operator awaiting its target word.
    let redirOp = null;

    // End the current simple command and reset the per-command state.
    const flush = () => {
      if (words.length && !discard) this.out.push(words);
      words = [];
      discard = false;
      caseHead = false;
      dblBracket = false;
    };

    for (;;) {
      const tok = this.readToken();
      if (tok.type === 'eof') {
        flush();
        return;
      }

      if (tok.type === 'word') {
        const w = tok.word;
        // The word right after a redirection operator is its target (file or heredoc
        // delimiter), never a command argument, so it is dropped here.
        if (redirOp) {
          if (redirOp === '<<' || redirOp === '<<-') {
            // The body starts on the next line, so only register the heredoc; drainHeredocs
            // consumes it when readToken reaches that newline. A quoted or escaped delimiter
            // (`<<'EOF'`) means the body is not expanded.
            this.pending.push({ delim: w.text, quoted: w.quoted, strip: redirOp === '<<-' });
          }
          redirOp = null;
          continue;
        }
        if (words.length === 0) {
          // In a case pattern list the leading words are patterns, not commands; only an
          // unquoted `esac` leaves the list.
          if (patternMode) {
            if (!w.quoted && w.text === 'esac') {
              caseDepth = Math.max(0, caseDepth - 1);
              patternMode = false;
            }
            continue;
          }
          if (!w.quoted && w.text === 'esac') {
            caseDepth = Math.max(0, caseDepth - 1);
            continue;
          }
          // Only unquoted words count as keywords: `'if' x` runs a command named if.
          // (`esac` just above covers an empty or just-closed last clause.)
          if (!w.quoted && KEYWORDS.has(w.text)) continue;
          if (!w.quoted && (w.text === 'for' || w.text === 'select')) discard = true;
          if (!w.quoted && w.text === 'case') {
            discard = true;
            caseHead = true;
          }
          if (!w.quoted && w.text === '[[') dblBracket = true;
        } else if (caseHead && !w.quoted && w.text === 'in') {
          // Not at command start: `in` after `case WORD` ends the case head and opens the
          // pattern list; flushing drops the discarded head.
          caseDepth += 1;
          patternMode = true;
          flush();
          continue;
        } else if (dblBracket && w.text === ']]') {
          // `]]` closes the test; operators mean what they normally do again.
          dblBracket = false;
        }
        words.push(w);
        continue;
      }

      // From here the token is an operator.
      const op = tok.op;
      if (
        dblBracket &&
        (op === '&&' || op === '||' || op === '(' || op === ')' || op === '<' || op === '>')
      ) {
        continue;
      }
      // Remember the redirect so the next word is consumed as its target.
      if (REDIRECT_OPS.has(op)) {
        redirOp = op;
        continue;
      }
      // Any non-redirect operator abandons a dangling redirect (`> ;`).
      redirOp = null;

      // Pattern lists use `|` between alternatives, an optional `(` before the first
      // one, and may wrap across lines; none of these separate commands.
      if (patternMode && (op === '\n' || op === '|' || op === '(')) continue;
      // `)` ends a case pattern; otherwise, in a $(...) body, it ends the substitution
      // unless it closes a nested subshell. At top level an unbalanced `)` is ignored.
      if (op === ')') {
        flush();
        if (patternMode) {
          patternMode = false;
        } else if (isSub) {
          if (parenDepth > 0) parenDepth -= 1;
          else return;
        }
        continue;
      }
      flush();
      if (op === '(' && isSub) parenDepth += 1;
      // `;;` / `;&` / `;;&` end a case clause: the next words are patterns again.
      if ((op === ';;' || op === ';&' || op === ';;&') && caseDepth > 0) patternMode = true;
    }
  }

  /**
   * Read the next token: a word, an operator, or EOF. Skips blanks, comments
   * and fd-number prefixes of redirections; drains pending heredocs at newlines.
   * @returns {{type: 'word', word: Word}|{type: 'op', op: string}|{type: 'eof'}}
   */
  readToken() {
    const s = this.src;
    for (;;) {
      while (this.pos < s.length) {
        const c = s[this.pos];
        if (c === ' ' || c === '\t' || c === '\r') this.pos += 1;
        // Line continuation (LF or CRLF form) joins lines, so it is not a separator.
        else if (c === '\\' && s[this.pos + 1] === '\n') this.pos += 2;
        else if (c === '\\' && s[this.pos + 1] === '\r' && s[this.pos + 2] === '\n') this.pos += 3;
        else break;
      }
      if (this.pos >= s.length) return { type: 'eof' };
      const c = s[this.pos];
      // A `#` at a token boundary starts a comment (a mid-word `#` is handled by
      // readWord and stays literal), so `# git log` is never matched.
      if (c === '#') {
        while (this.pos < s.length && s[this.pos] !== '\n') this.pos += 1;
        continue;
      }
      // Newline separates commands, and is where heredoc bodies announced on this
      // line begin, so they must be skipped here.
      if (c === '\n') {
        this.pos += 1;
        this.drainHeredocs();
        return { type: 'op', op: '\n' };
      }
      // Process substitution `<(cmd)` / `>(cmd)`: the inner commands run, so parse
      // them; the whole thing becomes a dynamic word (it expands to a /dev/fd path).
      if ((c === '<' || c === '>') && s[this.pos + 1] === '(') {
        this.pos += 2;
        this.parseSub();
        return { type: 'word', word: { ...emptyWord(), text: DYN } };
      }
      // The word-terminating metacharacters (same set readWord breaks on) are operators.
      if (';&|()<>'.includes(c)) return { type: 'op', op: this.readOperator() };

      const word = this.readWord();
      // A bare number glued to a redirect (`2>file`, `3<&0`) is a file descriptor,
      // not an argument: drop it and let the operator be read next. `2<(cmd)` is
      // excluded because that is a number followed by a process substitution.
      const next = s[this.pos];
      if (
        !word.quoted &&
        /^\d+$/.test(word.text) &&
        (next === '<' || next === '>') &&
        s[this.pos + 1] !== '('
      ) {
        continue;
      }
      return { type: 'word', word };
    }
  }

  /**
   * Consume an operator at the current position.
   * @returns {string}
   */
  readOperator() {
    const s = this.src;
    // Longest match first, so `&>>` is not read as `&>` then `>`, `;;&` not as `;;`.
    const three = s.slice(this.pos, this.pos + 3);
    const two = s.slice(this.pos, this.pos + 2);
    let op;
    if (three === ';;&' || three === '&>>' || three === '<<<' || three === '<<-') op = three;
    else if (['&&', '||', '|&', ';;', ';&', '&>', '<<', '<&', '<>', '>>', '>&', '>|'].includes(two))
      op = two;
    else op = s[this.pos];
    this.pos += op.length;
    return op;
  }

  /**
   * Read one word (quoting removed, expansions replaced by DYN markers).
   * Sub-commands inside substitutions are appended to `out` as a side effect.
   * @returns {Word}
   */
  readWord() {
    const s = this.src;
    const w = emptyWord();
    // Open `{` positions. A brace group only expands (so is dynamic) if it contains a
    // `,` or `..`; plain `{x}` stays literal.
    const braces = [];
    while (this.pos < s.length) {
      const c = s[this.pos];
      // `NAME=(a b c)` array assignment: `(` would otherwise end the word, so swallow
      // the whole parenthesised value and treat it as unknown.
      if (c === '(' && w.isAssign && w.text.endsWith('=')) {
        this.skipParens();
        w.text += DYN;
        continue;
      }
      // Unquoted metacharacters end the word; quoted ones are consumed by the branches below.
      if (' \t\n\r;&|()<>'.includes(c)) break;
      // Backslash: the escaped character becomes literal text and marks the word as
      // quoted. A trailing backslash or backslash-newline is simply dropped.
      if (c === '\\') {
        const n = s[this.pos + 1];
        if (n === undefined) {
          this.pos += 1;
        } else if (n === '\n') {
          this.pos += 2;
        } else {
          w.text += n;
          w.quoted = true;
          this.pos += 2;
        }
      } else if (c === "'") {
        // Single quotes: fully literal, no escapes. An unterminated quote runs to the
        // end of input (the "unbalanced is literal" rule).
        const end = s.indexOf("'", this.pos + 1);
        w.text += end === -1 ? s.slice(this.pos + 1) : s.slice(this.pos + 1, end);
        this.pos = end === -1 ? s.length : end + 1;
        w.quoted = true;
      } else if (c === '"') {
        // Double quotes: literal except for expansions, which readExpandable marks.
        this.pos += 1;
        this.readExpandable('"', w);
        w.quoted = true;
      } else if (c === '`') {
        this.pos += 1;
        this.readBacktick(w);
      } else if (c === '$') {
        this.readDollar(w, false);
      } else {
        // Unquoted glob and brace characters are recorded (quoted ones never reach this
        // branch). They only matter in a command word, where they make the executable
        // name unknowable (see commandWordInfo).
        if (c === '*' || c === '?' || c === '[') {
          w.globAt.push(w.text.length);
        } else if (c === '{') {
          braces.push({ at: w.text.length, hit: false });
        } else if (c === ',') {
          for (const b of braces) b.hit = true;
        } else if (c === '.' && s[this.pos - 1] === '.') {
          for (const b of braces) b.hit = true;
        } else if (c === '}') {
          const b = braces.pop();
          if (b && b.hit) w.globAt.push(b.at);
        } else if (c === '=' && !w.isAssign && !w.quoted && NAME_RE.test(w.text)) {
          // First unquoted `=` after a valid name makes this a `NAME=value` assignment.
          w.isAssign = true;
        }
        w.text += c;
        this.pos += 1;
      }
    }
    return w;
  }

  /**
   * Read text that undergoes expansion (double quotes, `${…}` bodies, unquoted
   * heredoc bodies) until its terminator; only the expansions matter, the
   * literal text is appended to `w`.
   * @param {'"'|'}'|null} mode - Terminator: `"`, `}`, or null for EOF (heredoc body)
   * @param {Word} w
   */
  readExpandable(mode, w) {
    const s = this.src;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (mode === '"' && c === '"') {
        this.pos += 1;
        return;
      }
      if (mode === '}' && c === '}') {
        this.pos += 1;
        return;
      }
      // Inside expandable text a backslash only escapes `$`, backtick, backslash,
      // newline and (in quote/brace bodies) `"`; before anything else it stays a
      // literal backslash. Escaping `$` matters: `"\$(x)"` is NOT a substitution.
      // Heredoc bodies (mode null) do not escape `"`.
      if (c === '\\') {
        const n = s[this.pos + 1];
        if (n === undefined) {
          this.pos += 1;
        } else if (n === '\n') {
          this.pos += 2;
        } else if (n === '$' || n === '`' || n === '\\' || (n === '"' && mode !== null)) {
          w.text += n;
          this.pos += 2;
        } else {
          w.text += '\\';
          this.pos += 1;
        }
      } else if (c === '$') {
        this.readDollar(w, true);
      } else if (c === '`') {
        this.pos += 1;
        this.readBacktick(w);
      } else if (mode === '}' && c === "'") {
        // Inside `${...}` quotes nest freely: single-quoted text is inert (skipped),
        // double-quoted text may still contain expansions.
        const end = s.indexOf("'", this.pos + 1);
        this.pos = end === -1 ? s.length : end + 1;
      } else if (mode === '}' && c === '"') {
        this.pos += 1;
        this.readExpandable('"', w);
      } else {
        w.text += c;
        this.pos += 1;
      }
    }
  }

  /**
   * Handle a `$` at the current position (variable, `${…}`, `$(…)`, `$((…))`,
   * `$'…'`, `$"…"`, or a literal `$`).
   * @param {Word} w
   * @param {boolean} inQuotes - True inside double quotes / expandable text
   */
  readDollar(w, inQuotes) {
    const s = this.src;
    const n = s[this.pos + 1];
    // Every expansion leaves one DYN in the word; the commands inside `$(...)` are
    // parsed (as a side effect) so they are still matched on their own.
    if (n === '(') {
      // `$((` is arithmetic only if it truly closes with `))`; otherwise it is `$(`
      // plus a subshell `(...)`, which does run commands (see isArithmetic).
      if (s[this.pos + 2] === '(' && this.isArithmetic(this.pos + 3)) {
        this.pos += 3;
        this.skipArithmetic();
      } else {
        this.pos += 2;
        this.parseSub();
      }
      w.text += DYN;
    } else if (n === '{') {
      // The `${...}` body can itself hold `$(...)`, so it is scanned for expansions
      // but its text is discarded (hence the throwaway word).
      this.pos += 2;
      this.readExpandable('}', emptyWord());
      w.text += DYN;
    } else if (n !== undefined && /[A-Za-z_]/.test(n)) {
      // $NAME: consume the whole identifier.
      this.pos += 1;
      while (this.pos < s.length && /[A-Za-z0-9_]/.test(s[this.pos])) this.pos += 1;
      w.text += DYN;
    } else if (n !== undefined && /[0-9?$!#@*-]/.test(n)) {
      // Single-character special parameters ($1, $?, $$, $@, ...).
      this.pos += 2;
      w.text += DYN;
    } else if (!inQuotes && n === "'") {
      // ANSI-C quoting `$'...'`: a plain body is literal, but a body with backslash
      // escapes (\x67it) is not decoded, so the word is treated as unknown rather than
      // risk matching the wrong text. Inside double quotes `$'` is literal, hence the
      // `!inQuotes` guard.
      let i = this.pos + 2;
      while (i < s.length && s[i] !== "'") i += s[i] === '\\' ? 2 : 1;
      const body = s.slice(this.pos + 2, i);
      this.pos = Math.min(i + 1, s.length);
      w.text += body.includes('\\') ? DYN : body;
      w.quoted = true;
    } else if (!inQuotes && n === '"') {
      // Locale-translated string `$"..."` behaves like a double-quoted string.
      this.pos += 2;
      this.readExpandable('"', w);
      w.quoted = true;
    } else {
      // A lone `$` (end of word, `$ `, `$.`) is just a literal dollar sign.
      w.text += '$';
      this.pos += 1;
    }
  }

  /** Parse a `$(…)` / `<(…)` body (position just after the opening paren). */
  parseSub() {
    // Counts nested substitutions on this parser; ParseLimit unwinds to parseCommand,
    // which keeps whatever was already parsed.
    this.nest += 1;
    if (this.nest > MAX_NEST) throw new ParseLimit();
    this.parseSequence(true);
    this.nest -= 1;
  }

  /**
   * Whether the `$((` whose body starts at `start` is a real arithmetic expansion.
   * Like bash, it is only arithmetic when the body closes with an adjacent `))`;
   * otherwise (e.g. `$((cmd) )`) it is a command substitution wrapping a subshell.
   * Pure lookahead: no parsing side effects.
   * @param {number} start
   * @returns {boolean}
   */
  isArithmetic(start) {
    const s = this.src;
    // Start at depth 2 for the already-seen `$((`. When depth returns to 0 the final
    // two `)` must be adjacent: `$((1+2))` is arithmetic, `$((cmd) )` is not.
    // Unbalanced input returns false, falling back to the stricter command-substitution
    // parse (which inspects more, not less).
    let depth = 2;
    let lastClose = -2;
    for (let i = start; i < s.length; i += 1) {
      if (s[i] === '(') depth += 1;
      else if (s[i] === ')') {
        depth -= 1;
        if (depth === 0) return lastClose === i - 1;
        lastClose = i;
      }
    }
    return false;
  }

  /** Skip an arithmetic expansion body (position just after `$((`), parsing nested `$(…)`. */
  skipArithmetic() {
    const s = this.src;
    let depth = 2;
    while (this.pos < s.length && depth > 0) {
      const c = s[this.pos];
      // A real `$(cmd)` inside arithmetic still executes, so parse it. `$((` is
      // excluded: that is nested arithmetic, handled by the paren counting.
      if (c === '$' && s[this.pos + 1] === '(' && s[this.pos + 2] !== '(') {
        this.pos += 2;
        this.parseSub();
        continue;
      }
      if (c === '(') depth += 1;
      else if (c === ')') depth -= 1;
      this.pos += 1;
    }
  }

  /** Skip a balanced `( … )` region (array assignment value); honours only single quotes and backslashes. */
  skipParens() {
    const s = this.src;
    // Single-quoted and backslash-escaped parens must not change the nesting depth.
    // Double quotes are not tracked, so a paren inside them still counts.
    let depth = 0;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (c === "'") {
        const end = s.indexOf("'", this.pos + 1);
        this.pos = end === -1 ? s.length : end + 1;
        continue;
      }
      if (c === '\\') {
        this.pos += 2;
        continue;
      }
      this.pos += 1;
      if (c === '(') depth += 1;
      else if (c === ')') {
        depth -= 1;
        if (depth === 0) return;
      }
    }
  }

  /**
   * Parse a backtick command substitution (position just after the opening backtick).
   * @param {Word} w
   */
  readBacktick(w) {
    const s = this.src;
    // Find the closing backtick, skipping backslash-escaped characters.
    let i = this.pos;
    while (i < s.length && s[i] !== '`') i += s[i] === '\\' ? 2 : 1;
    // Inside backticks only backtick, backslash and `$` are escapable; undo that so
    // the inner text is the command as the shell would see it, then parse it with a
    // fresh sub-parser (depth + 1, so MAX_NEST bounds backtick recursion too).
    const inner = s.slice(this.pos, i).replace(/\\([`\\$])/g, '$1');
    this.pos = Math.min(i + 1, s.length);
    new Parser(inner, this.depth + 1, this.out).parseSequence(false);
    w.text += DYN;
  }

  /** Consume the bodies of heredocs registered on the line that just ended. */
  drainHeredocs() {
    if (!this.pending.length) return;
    const s = this.src;
    // Take ownership of this line's heredocs; several may share one line and their
    // bodies follow one after another, in order.
    const heredocs = this.pending;
    this.pending = [];
    for (const h of heredocs) {
      // Scan line by line for the terminator (exact match; CR stripped for CRLF input;
      // leading tabs stripped for `<<-`). If it never appears the body runs to end of
      // input, as in bash.
      let lineStart = this.pos;
      let bodyEnd = s.length;
      let next = s.length;
      while (lineStart < s.length) {
        const nl = s.indexOf('\n', lineStart);
        const lineEnd = nl === -1 ? s.length : nl;
        let line = s.slice(lineStart, lineEnd);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (h.strip) line = line.replace(/^\t+/, '');
        if (line === h.delim) {
          bodyEnd = lineStart;
          next = nl === -1 ? s.length : nl + 1;
          break;
        }
        lineStart = nl === -1 ? s.length : nl + 1;
      }
      // An unquoted delimiter means the body is expanded, so `$(...)` in it runs
      // commands: scan it for those. A quoted delimiter makes the body inert text (for
      // example a script being written to a file), which is skipped entirely.
      if (!h.quoted) {
        const body = new Parser(s.slice(this.pos, bodyEnd), this.depth + 1, this.out);
        body.readExpandable(null, emptyWord());
      }
      this.pos = next;
    }
  }
}

/**
 * Split a command line into simple commands. Never throws on odd input; when
 * nesting exceeds the parser's limits it stops and returns what it has.
 * @param {string} command
 * @returns {Word[][]} Simple commands, each a list of words (redirections removed)
 */
function parseCommand(command) {
  const out = [];
  try {
    new Parser(command, 0, out).parseSequence(false);
  } catch (err) {
    // Nesting limit: stop descending but keep the commands parsed so far (they are
    // still checked). Anything else is a real bug and propagates to checkCommand,
    // which fails open.
    if (!(err instanceof ParseLimit)) throw err;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Normalizer: simple command -> effective commands (wrappers / re-entry)
// ---------------------------------------------------------------------------

/**
 * @typedef {object} WrapperSpec
 * @property {string[]} [valueFlags] - Flags that consume the next word
 * @property {string[]} [scriptFlags] - Flags whose value is a shell script string
 * @property {string[]} [lookupFlags] - Flags that turn the command into a lookup (never executes)
 * @property {boolean} [assign] - Skip `VAR=value` words before the command
 * @property {number} [positional] - Positional words to skip after the flags
 * @property {boolean} [restIsScript] - The remaining words form a shell script
 */

// Commands that run another command (or script) given as arguments. Each entry
// says how to skip the wrapper's own options to find what it runs, so
// `sudo -u root git log` is also checked as `git log`. Flags are listed only when
// they take a separate value word; unknown flags are assumed to be boolean.
/** @type {Record<string, WrapperSpec>} */
const WRAPPERS = {
  env: {
    valueFlags: ['-u', '-C', '--unset', '--chdir'],
    scriptFlags: ['-S', '--split-string'],
    assign: true,
  },
  command: { lookupFlags: ['-v', '-V'] },
  builtin: {},
  exec: { valueFlags: ['-a'] },
  nohup: {},
  time: { valueFlags: ['-f', '-o', '--format', '--output'] },
  sudo: {
    valueFlags: [
      '-u',
      '-g',
      '-h',
      '-p',
      '-C',
      '-D',
      '-r',
      '-t',
      '-U',
      '-T',
      '--user',
      '--group',
      '--host',
      '--prompt',
      '--chdir',
    ],
    assign: true,
  },
  doas: { valueFlags: ['-u', '-C'], assign: true },
  nice: { valueFlags: ['-n', '--adjustment'] },
  ionice: { valueFlags: ['-c', '-n', '-p', '-P', '-u', '--class', '--classdata'] },
  // `positional`: `timeout DURATION cmd`, `flock FILE cmd`, `taskset MASK cmd` and
  // `chrt PRIO cmd` have a mandatory positional before the command.
  timeout: { valueFlags: ['-k', '-s', '--kill-after', '--signal'], positional: 1 },
  stdbuf: { valueFlags: ['-i', '-o', '-e', '--input', '--output', '--error'] },
  setsid: {},
  flock: {
    valueFlags: ['-w', '-E', '--timeout', '--conflict-exit-code'],
    scriptFlags: ['-c', '--command'],
    positional: 1,
  },
  // watch hands its arguments to `sh -c`, so they form one script, not an argv.
  watch: { valueFlags: ['-n', '--interval'], restIsScript: true },
  taskset: { positional: 1 },
  chrt: { positional: 1 },
  fakeroot: {},
  unbuffer: {},
  xargs: {
    valueFlags: [
      '-I',
      '-J',
      '-L',
      '-n',
      '-P',
      '-s',
      '-d',
      '-E',
      '-a',
      '-R',
      '-S',
      '--max-args',
      '--max-procs',
      '--max-chars',
      '--max-lines',
      '--delimiter',
      '--arg-file',
    ],
  },
};

// Only the `run` subcommand executes a wrapped command; other subcommands
// (`bws secret list`) run nothing, so they are not unwrapped.
/** Secrets-manager CLIs whose `run` subcommand wraps a command, with their value-taking flags. */
const SECRETS_RUN_TOOLS = {
  bws: [
    '-t',
    '--access-token',
    '--server-url',
    '--profile',
    '-o',
    '--output',
    '--color',
    '--project-id',
    '--shell',
  ],
  op: ['--account', '--config', '--cache', '--session', '--env-file', '--environment'],
  doppler: [
    '-p',
    '--project',
    '-c',
    '--config',
    '--token',
    '--scope',
    '--api-host',
    '--mount',
    '--mount-template',
    '--mount-format',
  ],
};

// Shells whose `-c SCRIPT` is re-parsed, the `find` flags that run a command, and
// the shell options that consume the next word (so `-o`'s value is not mistaken
// for the script).
const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'ash']);
const FIND_EXEC_FLAGS = new Set(['-exec', '-execdir', '-ok', '-okdir']);
const SHELL_VALUE_FLAGS = new Set(['-o', '+o', '-O', '+O', '--rcfile', '--init-file']);

/**
 * Render a word for inclusion in a normalized command string.
 * @param {Word} w
 * @returns {string}
 */
function argText(w) {
  // Render unknown expansions as `$`, so `git $X` still matches `git *` and the
  // NUL marker never leaks into a pattern comparison.
  return w.text.replaceAll(DYN, '$');
}

/**
 * Build a synthetic literal word (a script assembled from other words).
 * @param {Word[]} words
 * @returns {Word}
 */
function joinedScript(words) {
  // `eval`, `watch` and secrets-run join their words with spaces, as the shell
  // would, then the result is re-parsed from scratch, so only `.text` matters here.
  return { ...emptyWord(), text: words.map(argText).join(' '), quoted: true };
}

/**
 * Describe a command word: its literal basename and whether it is dynamic.
 * @param {Word} w
 * @returns {{base: string, dynamic: boolean}}
 */
function commandWordInfo(w) {
  // `[` / `[[` are test builtins; without this their own `[` glob character would
  // make every test command look dynamic.
  if (w.text === '[' || w.text === '[[') return { base: w.text, dynamic: false };
  // Only the basename is matched, so `/usr/bin/git` and `./git` both read as `git`.
  // A dynamic or glob directory part (`$HOME/bin/git`) is harmless; a dynamic or
  // glob basename (`$CMD`, `g*t`) means we cannot tell what runs.
  const slash = w.text.lastIndexOf('/');
  const base = w.text.slice(slash + 1);
  const dynamic = base.includes(DYN) || w.globAt.some((i) => i > slash);
  return { base, dynamic };
}

/**
 * Skip a wrapper's own flags (and positionals) to find where its command starts.
 * @param {WrapperSpec} spec
 * @param {Word[]} args - Words after the wrapper name
 * @returns {{lookup: boolean, rest: Word[], script: Word|null, dashDash: boolean}}
 */
function parseWrapperArgs(spec, args) {
  const valueFlags = new Set(spec.valueFlags || []);
  const scriptFlags = new Set(spec.scriptFlags || []);
  const lookupFlags = new Set(spec.lookupFlags || []);
  let i = 0;
  let script = null;
  let dashDash = false;
  while (i < args.length) {
    const w = args[i];
    const t = w.text;
    // Wrappers like `env`/`sudo` accept `VAR=value` words before the command.
    if (w.isAssign && spec.assign) {
      i += 1;
    } else if (t === '--' && !w.quoted) {
      // An unquoted `--` ends the wrapper's options; the command follows.
      dashDash = true;
      i += 1;
      break;
    } else if (t.length > 1 && t[0] === '-') {
      // Any other `-flag` belongs to the wrapper. A lone `-` is a word, not a flag.
      // e.g. `command -v git` only looks the command up; nothing runs.
      if (lookupFlags.has(t)) return { lookup: true, rest: [], script: null, dashDash };
      // This flag's value is a script to expand (e.g. `env -S 'git log'`).
      if (scriptFlags.has(t)) {
        script = args[i + 1] || null;
        i += 2;
      } else if (valueFlags.has(t)) {
        i += 2;
      } else {
        i += 1;
      }
    } else {
      break;
    }
  }
  // Skip mandatory positional arguments that sit between the flags and the command.
  for (let p = spec.positional || 0; p > 0 && i < args.length; p -= 1) i += 1;
  // Some wrappers accept the script flag after the positional (`flock FILE -c cmd`).
  if (!script && scriptFlags.size && i < args.length && scriptFlags.has(args[i].text)) {
    script = args[i + 1] || null;
    i += 2;
  }
  return { lookup: false, rest: args.slice(i), script, dashDash };
}

/**
 * Check whether `words` begins with the configured secrets-manager prefix.
 * The first element is compared by basename; elements containing `$`
 * placeholders match any single word.
 * @param {Word[]} words
 * @param {string[]|undefined} prefix
 * @returns {Word[]|null} The words after the prefix, or null when it does not match
 */
function stripConfiguredPrefix(words, prefix) {
  if (!Array.isArray(prefix) || !prefix.length || words.length < prefix.length) return null;
  for (let i = 0; i < prefix.length; i += 1) {
    const want = String(prefix[i]);
    const got = words[i].text;
    // Placeholder elements (`${BWS_PROJECT_ID}`) can expand to anything, so any
    // non-empty word satisfies them.
    if (/\$/.test(want)) {
      if (!got) return null;
    } else if (i === 0) {
      // The first element is the tool itself: compare by basename, like any command word.
      if (commandWordInfo(words[0]).base !== want.slice(want.lastIndexOf('/') + 1)) return null;
    } else if (got !== want) {
      return null;
    }
  }
  return words.slice(prefix.length);
}

/**
 * Expand a script string (from `bash -c`, `eval`, `flock -c`, …) into effective commands.
 * @param {Word} scriptWord
 * @param {{secretsRun?: string[]}} ctx
 * @param {number} depth
 * @param {Array<string|{dynamicWord: string}>} results - Output list
 */
function expandScript(scriptWord, ctx, depth, results) {
  // A script built from unknown expansions cannot be inspected, so it blocks as a
  // dynamic word instead of being silently allowed.
  if (scriptWord.text.includes(DYN)) {
    results.push({ dynamicWord: argText(scriptWord) });
    return;
  }
  // Re-enter the parser on the script text; depth + 1 bounds `bash -c` chains.
  for (const words of parseCommand(scriptWord.text)) {
    collectEffective(words, ctx, depth + 1, results);
  }
}

/**
 * Compute the effective normalized commands one simple command runs,
 * recursing through wrappers, shells, `eval`, `find -exec`, `xargs` and
 * secrets-manager run wrappers. A dynamic command word yields a
 * `{dynamicWord}` entry instead of a string.
 * @param {Word[]} words
 * @param {{secretsRun?: string[]}} ctx
 * @param {number} depth
 * @param {Array<string|{dynamicWord: string}>} results - Output list
 */
function collectEffective(words, ctx, depth, results) {
  // Too deeply re-entered: give up on this branch (fail open) rather than recurse
  // without bound. The outer commands were already recorded.
  if (depth > MAX_EXPAND_DEPTH) return;
  let i = 0;
  // Leading `VAR=value` assignments are not the command; skip them. A line of only
  // assignments runs nothing.
  while (i < words.length && words[i].isAssign) i += 1;
  if (i >= words.length) return;
  const rest = words.slice(i);
  const info = commandWordInfo(rest[0]);
  // Dynamic command word rule: if the executable cannot be named statically
  // (`$CMD args`, `$(find-tool)`, `g*t`), block rather than guess.
  if (info.dynamic) {
    results.push({ dynamicWord: argText(rest[0]) });
    return;
  }
  const { base } = info;
  // Empty basename (e.g. a bare `/`): nothing to match or unwrap.
  if (!base) return;
  const args = rest.slice(1);
  // The command as the patterns see it: basename plus arguments. Recorded before
  // unwrapping, so the wrapper itself (`sudo`, `bash`) is matchable too.
  results.push([base, ...args.map(argText)].join(' '));

  // The project's configured secrets wrapper (`secrets.run`): match what it runs.
  const afterPrefix = stripConfiguredPrefix(rest, ctx.secretsRun);
  if (afterPrefix) {
    collectEffective(afterPrefix, ctx, depth + 1, results);
    return;
  }

  // Built-in secrets managers (`bws run -- cmd`). `hasOwn` avoids prototype keys
  // such as `constructor`. Skip the tool's global flags to find `run`; any other
  // subcommand executes nothing, so we stop there.
  if (Object.hasOwn(SECRETS_RUN_TOOLS, base)) {
    const valueFlags = new Set(SECRETS_RUN_TOOLS[base]);
    let k = 0;
    while (k < args.length && args[k].text.length > 1 && args[k].text[0] === '-') {
      k += valueFlags.has(args[k].text) ? 2 : 1;
    }
    if (k < args.length && args[k].text === 'run') {
      const parsed = parseWrapperArgs(
        { valueFlags: [...valueFlags], scriptFlags: ['--command'] },
        args.slice(k + 1),
      );
      // `--command` takes a script; after `--` the rest is an argv; with neither, the
      // remaining words are joined and run through a shell.
      if (parsed.script) expandScript(parsed.script, ctx, depth, results);
      else if (parsed.dashDash) collectEffective(parsed.rest, ctx, depth + 1, results);
      else if (parsed.rest.length) expandScript(joinedScript(parsed.rest), ctx, depth, results);
    }
    return;
  }

  // Shells: only `-c SCRIPT` carries inline commands. Running a script file
  // (`bash x.sh`) or stdin is a known gap and is not inspected.
  if (SHELLS.has(base)) {
    let hasC = false;
    let k = 0;
    while (k < args.length) {
      const t = args[k].text;
      if (t === '--') {
        k += 1;
        break;
      }
      if (/^[-+][A-Za-z]+$/.test(t) || /^--[A-Za-z-]+$/.test(t)) {
        // Option words only (`-c`, `-lc`, `+e`, `--norc`); the first non-option word is
        // the script. `c` may be bundled (`-lc`); `--` is handled above, not here.
        if (t[0] === '-' && t[1] !== '-' && t.includes('c')) hasC = true;
        k += SHELL_VALUE_FLAGS.has(t) ? 2 : 1;
      } else {
        break;
      }
    }
    if (hasC && k < args.length) expandScript(args[k], ctx, depth, results);
    return;
  }

  // `eval` joins its arguments and re-parses them, so `eval git log` is `git log`.
  if (base === 'eval') {
    if (!args.length) return;
    // Any unknown piece makes the evaluated text unknowable: block.
    if (args.some((a) => a.text.includes(DYN))) {
      results.push({ dynamicWord: `eval ${args.map(argText).join(' ')}` });
      return;
    }
    expandScript(joinedScript(args), ctx, depth, results);
    return;
  }

  // `find ... -exec CMD ... ;` (or `+`): the words up to the terminator are a
  // command. Several -exec clauses may appear, so keep scanning after each one.
  if (base === 'find') {
    for (let k = 0; k < args.length; k += 1) {
      if (!FIND_EXEC_FLAGS.has(args[k].text)) continue;
      let end = k + 1;
      while (end < args.length && args[end].text !== ';' && args[end].text !== '+') end += 1;
      collectEffective(args.slice(k + 1, end), ctx, depth + 1, results);
      k = end;
    }
    return;
  }

  // Generic wrappers from the WRAPPERS table: skip their options, then check either
  // their script (`-c`-style or `restIsScript`) or the command they run.
  if (Object.hasOwn(WRAPPERS, base)) {
    const spec = WRAPPERS[base];
    const parsed = parseWrapperArgs(spec, args);
    // A lookup such as `command -v` runs nothing.
    if (parsed.lookup) return;
    if (parsed.script) expandScript(parsed.script, ctx, depth, results);
    else if (spec.restIsScript && parsed.rest.length)
      expandScript(joinedScript(parsed.rest), ctx, depth, results);
    else if (!spec.restIsScript && parsed.rest.length)
      collectEffective(parsed.rest, ctx, depth + 1, results);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @typedef {object} CheckOptions
 * @property {string[]} [secretsRun] - The `secrets.run` prefix from .aiconfig.json
 *   (e.g. `["bws","run","--project-id","${BWS_PROJECT_ID}","--"]`); the command
 *   after this prefix is matched as its own simple command.
 */

/**
 * @typedef {{type: 'pattern', pattern: string}|{type: 'dynamic', word: string}} BlockResult
 */

/**
 * Check a shell command line against blocked glob patterns. Every simple
 * command in the line (compound, piped, substituted, wrapped, re-entered via
 * `bash -c`/`eval`/`find -exec`/`xargs`) is normalized and tested; a command
 * word whose executable cannot be determined statically blocks the line.
 * Fails open (null) on empty input, no valid patterns, or any internal error.
 * @param {string} command - The shell command line
 * @param {string[]} patterns - Glob patterns using `*` as wildcard (e.g. ["git *", "gh *"])
 * @param {CheckOptions} [options]
 * @returns {BlockResult|null} The first block reason, or null to allow
 */
export function checkCommand(command, patterns, options = {}) {
  // Fail open on anything we cannot meaningfully check: this is a guard rail for
  // workflow discipline, and a broken hook must never block every command.
  if (typeof command !== 'string' || !command.trim()) return null;
  if (!Array.isArray(patterns)) return null;
  const valid = patterns.filter((p) => typeof p === 'string' && p);
  if (!valid.length) return null;

  try {
    const ctx = { secretsRun: options && options.secretsRun };
    // Strip real NULs from the input so user text cannot impersonate a DYN marker.
    for (const words of parseCommand(command.replaceAll(DYN, ''))) {
      const results = [];
      collectEffective(words, ctx, 0, results);
      for (const r of results) {
        // Results arrive in order and the first hit wins; a dynamic word blocks
        // immediately, even if a later command would have matched a pattern.
        if (typeof r !== 'string') return { type: 'dynamic', word: r.dynamicWord };
        for (const pattern of valid) {
          if (patternMatches(pattern, r)) return { type: 'pattern', pattern };
        }
      }
    }
    return null;
  } catch {
    // Unexpected internal error: fail open (see the module header).
    return null;
  }
}

/**
 * Check a shell command string against a list of blocked glob patterns.
 * Wraps `checkCommand` for callers that only need a string reason.
 * @param {string} command - The shell command to check (e.g. "cd x && git status")
 * @param {string[]} patterns - Glob patterns using `*` as wildcard (e.g. ["git *", "gh *"])
 * @param {CheckOptions} [options]
 * @returns {string|null} The matched pattern, `DYNAMIC_WORD_REASON` for a dynamic
 *   command word, or null if the command is allowed
 */
export function matchesBlockedCommand(command, patterns, options = {}) {
  const result = checkCommand(command, patterns, options);
  if (!result) return null;
  return result.type === 'pattern' ? result.pattern : DYNAMIC_WORD_REASON;
}
