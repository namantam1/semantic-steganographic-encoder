import type { Model } from '../types';

/**
 * Splits a string into words using dynamic programming and the vocabulary.
 * @param model - The N-gram model containing vocab.
 * @param text - The string to split (no spaces).
 * @returns The text split into words with spaces.
 */
export function splitIntoWords(model: Model, text: string): string {
  if (!text || text.length === 0) return '';

  const n = text.length;
  // dp[i] stores the minimum number of unrecognized characters needed to reach position i
  const dp = new Array(n + 1).fill(Infinity);
  // parent[i] stores the starting position of the word ending at position i
  const parent = new Array(n + 1).fill(-1);

  dp[0] = 0; // Base case: no characters = 0 unrecognized

  // Build a Set of all vocabulary words for O(1) lookup
  const vocabSet = new Set(model.vocab);

  // Dynamic programming to find optimal word splits
  for (let i = 1; i <= n; i++) {
    // Try all possible words ending at position i
    for (let j = 0; j < i; j++) {
      const word = text.substring(j, i);

      if (vocabSet.has(word)) {
        // Valid word found - no penalty
        if (dp[j] < dp[i]) {
          dp[i] = dp[j];
          parent[i] = j;
        }
      }
    }

    // Also consider treating this position as an unrecognized character
    // (in case no valid word split exists)
    if (dp[i - 1] + 1 < dp[i]) {
      dp[i] = dp[i - 1] + 1;
      parent[i] = i - 1;
    }
  }

  // Reconstruct the word sequence
  const words: string[] = [];
  let pos = n;

  while (pos > 0 && parent[pos] !== -1) {
    const start = parent[pos];
    const word = text.substring(start, pos);

    // Check if this is a valid word or unrecognized characters
    if (vocabSet.has(word)) {
      words.unshift(word);
    } else {
      // Unrecognized segment - add as-is (could be multiple chars)
      words.unshift(word);
    }

    pos = start;
  }

  return words.join(' ');
}
