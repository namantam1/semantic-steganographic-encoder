export const BEAM_WIDTH = 20;
const SENTENCE_BREAK_ID = -1; // Special ID to signal a sentence break

// Type definitions
export interface Model {
  vocab: string[];
  map: {
    [wordId: string]: {
      [char: string]: number[];
    };
  };
}

export interface WordsByChar {
  [char: string]: number[];
}

export interface BeamPath {
  sequence: number[];
  score: number;
}

/**
 * Cleans the secret text to get the sequence of target characters.
 * @param text - The input text.
 * @returns An array of lowercase characters.
 */
export function getTargetChars(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z]/g, '').split('');
}

/**
 * Finds valid next words using the Beam Search algorithm.
 * @param model - The N-gram model containing vocab and map.
 * @param wordsByChar - Lookup object for words by first character.
 * @param currentWordId - ID of the last word in the path (or SENTENCE_BREAK_ID for sentence start).
 * @param targetChar - The required starting letter of the next word.
 * @returns List of [next_word_id, log_probability_score].
 */
export function getCandidates(
  model: Model,
  wordsByChar: WordsByChar,
  currentWordId: number,
  targetChar: string
): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];

  // If we're starting a new sentence (after a break), skip bigram lookup
  if (currentWordId === SENTENCE_BREAK_ID) {
    const startWords = wordsByChar[targetChar] || [];
    startWords.slice(0, BEAM_WIDTH).forEach((wordId, index) => {
      const score = 0.0 - (index * 0.1);
      candidates.push([wordId, score]);
    });
    return candidates;
  }

  const currentIdStr = String(currentWordId);

  // Strategy A: Look at the N-Gram Graph (Coherent transition)
  const transitions = model.map[currentIdStr];
  if (transitions && transitions[targetChar]) {
    // The JSON only stores the IDs, not the probabilities.
    // We assume the first word in the list is the most probable (highest score),
    // and assign a simple descending score sequence.
    const ids = transitions[targetChar];
    const baseScore = 0.0;
    ids.forEach((id, index) => {
      // Assign a slightly lower score for less likely options
      const score = baseScore - (index * 0.1);
      candidates.push([id, score]);
    });
  }

  // Strategy B: Sentence Break (If Strategy A found nothing)
  // Instead of using fallback words with heavy penalty, we signal a sentence break
  if (candidates.length === 0) {
    // Return a special SENTENCE_BREAK_ID to signal we should end the sentence
    candidates.push([SENTENCE_BREAK_ID, -0.5]); // Small penalty for breaking sentence
  }

  return candidates;
}

/**
 * Converts a beam path sequence to a readable sentence string.
 * @param model - The N-gram model containing vocab.
 * @param path - The beam path with sequence and score.
 * @returns The formatted sentence.
 */
export function pathToSentence(model: Model, path: BeamPath): string {
  const sentences: string[] = [];
  let currentSentence: string[] = [];

  for (const id of path.sequence) {
    if (id === SENTENCE_BREAK_ID) {
      // End current sentence and start a new one
      if (currentSentence.length > 0) {
        const sentence = currentSentence.join(" ");
        const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
        sentences.push(capitalized + ".");
        currentSentence = [];
      }
    } else {
      currentSentence.push(model.vocab[id]);
    }
  }

  // Add any remaining words as the final sentence
  if (currentSentence.length > 0) {
    const sentence = currentSentence.join(" ");
    const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    sentences.push(capitalized + ".");
  }

  return sentences.join(" ");
}

/**
 * Implements the Beam Search to find top N best-scoring sentences.
 * @param model - The N-gram model containing vocab and map.
 * @param wordsByChar - Lookup object for words by first character.
 * @param targetChars - Sequence of required starting characters.
 * @param beamWidth - Width of the beam search (default: BEAM_WIDTH).
 * @param topN - Number of top results to return (default: 1).
 * @returns Array of top N encoded sentences with their scores.
 */
export function encodeTextMultiple(
  model: Model,
  wordsByChar: WordsByChar,
  targetChars: string[],
  beamWidth: number = BEAM_WIDTH,
  topN: number = 1
): Array<{ text: string; score: number }> {
  if (!targetChars || targetChars.length === 0) return [{ text: "", score: 0 }];

  // Step 1: Initialize Beam with the first character
  const firstChar = targetChars[0];
  let beam: BeamPath[] = [];

  // Get initial candidates
  const startCandidates = wordsByChar[firstChar] || [];
  startCandidates.slice(0, beamWidth).forEach(w_id => {
    beam.push({
      sequence: [w_id],
      score: 0.0 // Start score is zero
    });
  });

  // Step 2: Iterate through the rest of the characters
  for (let char_idx = 1; char_idx < targetChars.length; char_idx++) {
    const targetChar = targetChars[char_idx];
    let newBeam: BeamPath[] = [];

    for (const path of beam) {
      const lastWordId = path.sequence[path.sequence.length - 1];
      const currentScore = path.score;

      const candidates = getCandidates(model, wordsByChar, lastWordId, targetChar);

      for (const [nextWordId, transScore] of candidates) {
        // If we get a SENTENCE_BREAK_ID, we need to add it and then find a word for this character
        if (nextWordId === SENTENCE_BREAK_ID) {
          // Add the sentence break
          const withBreak: BeamPath = {
            sequence: [...path.sequence, SENTENCE_BREAK_ID],
            score: currentScore + transScore
          };

          // Now get candidates for the current character as a sentence start
          const restartCandidates = getCandidates(model, wordsByChar, SENTENCE_BREAK_ID, targetChar);

          for (const [restartWordId, restartScore] of restartCandidates) {
            newBeam.push({
              sequence: [...withBreak.sequence, restartWordId],
              score: withBreak.score + restartScore
            });
          }
        } else {
          // Normal bigram transition
          newBeam.push({
            sequence: [...path.sequence, nextWordId],
            score: currentScore + transScore
          });
        }
      }
    }

    // Pruning: Sort by score (descending) and keep top K
    if (newBeam.length === 0) {
      // This happens if NO word could be found for the character (very rare)
      console.warn(`Dead end at character: ${targetChar}`);
      break;
    }

    newBeam.sort((a, b) => b.score - a.score);
    beam = newBeam.slice(0, beamWidth);
  }

  // Step 3: Return top N sentences
  if (beam.length === 0) return [{ text: "Encoding failed: No valid path found.", score: 0 }];

  const topPaths = beam.slice(0, Math.min(topN, beam.length));

  return topPaths.map(path => ({
    text: pathToSentence(model, path),
    score: path.score
  }));
}

/**
 * Implements the Beam Search to find the best-scoring sentence.
 * @param model - The N-gram model containing vocab and map.
 * @param wordsByChar - Lookup object for words by first character.
 * @param targetChars - Sequence of required starting characters.
 * @returns The encoded sentence.
 */
export function encodeText(
  model: Model,
  wordsByChar: WordsByChar,
  targetChars: string[]
): string {
  const results = encodeTextMultiple(model, wordsByChar, targetChars, BEAM_WIDTH, 1);
  return results[0].text;
}

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

/**
 * Decodes the cover text back into the secret message.
 * @param sentence - The encoded sentence.
 * @returns The decoded message (raw character string).
 */
export function decodeText(sentence: string): string {
  const words = sentence.toLowerCase().match(/[a-z]+/g) || [];
  return words.map(w => w[0]).join('');
}

/**
 * Decodes and splits the cover text into readable words.
 * @param model - The N-gram model containing vocab.
 * @param sentence - The encoded sentence.
 * @returns The decoded message split into words.
 */
export function decodeAndSplit(model: Model, sentence: string): string {
  const rawDecoded = decodeText(sentence);
  return splitIntoWords(model, rawDecoded);
}
