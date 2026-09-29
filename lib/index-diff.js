/**
 * Generic index-entry comparison shared by every `aif index` target.
 * No domain knowledge of decisions or architecture sections — just structural
 * equality over whatever shape of entry it's handed.
 */

/**
 * Structurally compare two index entries, ignoring array element order.
 * Generic over shape — sorts every array-valued field rather than a
 * hardcoded list, so the same function serves decisions entries
 * (decision_makers/tags/supersedes/superseded_by/affects) and
 * architecture entries (tags/key_files) alike.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function entriesEqual(a, b) {
  const normalize = (entry) => {
    const sorted = { ...entry };
    for (const key of Object.keys(sorted)) {
      if (Array.isArray(sorted[key])) {
        sorted[key] = [...sorted[key]].sort();
      }
    }
    return JSON.stringify(sorted);
  };
  return normalize(a) === normalize(b);
}
