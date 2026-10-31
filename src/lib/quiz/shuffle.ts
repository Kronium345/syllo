// Answer order for a quiz attempt (prompts/09): shuffled, but the same every time for the
// same attempt and question, so a resumed quiz and the review show what the learner saw.

/** FNV-1a: a small, stable string hash. */
function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** mulberry32: a seeded random number generator in [0, 1). */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Fisher–Yates shuffle seeded by `seed`. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const next = random(hash(seed));
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** "A", "B", … for answer tiles. */
export function answerLetter(index: number): string {
  return String.fromCharCode(65 + index);
}
