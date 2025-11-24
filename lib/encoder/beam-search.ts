import { BEAM_WIDTH, SENTENCE_BREAK_ID } from '../constants';
import type {
  Model,
  BigramModel,
  WordsByChar,
  BeamPath,
  FallbackStrategy,
} from '../types';
import { FallbackStrategy as FallbackStrategyEnum } from '../types';
import { getCandidates } from './models';
import { pathToSentence } from './sentence-builder';

/**
 * Implements the Beam Search to find top N best-scoring sentences.
 * @param model - The N-gram model containing vocab and map.
 * @param bigramModel - Optional bigram model for fallback (required for BIGRAM_FALLBACK and BIGRAM_THEN_BREAK strategies).
 * @param wordsByChar - Lookup object for words by first character.
 * @param targetChars - Sequence of required starting characters.
 * @param beamWidth - Width of the beam search (default: BEAM_WIDTH).
 * @param topN - Number of top results to return (default: 1).
 * @param fallbackStrategy - Strategy to use when model has no transitions (default: SENTENCE_BREAK).
 * @returns Array of top N encoded sentences with their scores.
 */
export function encodeTextMultiple(
  model: Model,
  bigramModel: BigramModel | null,
  wordsByChar: WordsByChar,
  targetChars: string[],
  beamWidth: number = BEAM_WIDTH,
  topN: number = 1,
  fallbackStrategy: FallbackStrategy = FallbackStrategyEnum.SENTENCE_BREAK
): Array<{ text: string; score: number }> {
  if (!targetChars || targetChars.length === 0) return [{ text: "", score: 0 }];

  // Step 1: Initialize Beam with the first character
  const firstChar = targetChars[0];
  let beam: BeamPath[] = [];

  // Get initial candidates (empty context for sentence start)
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
      const currentScore = path.score;

      // Build context from path sequence (for trigrams, we need last 2 words)
      // For efficiency, we only need the last 2 non-break words
      const context = path.sequence.slice(-2);

      const candidates = getCandidates(
        model,
        bigramModel,
        wordsByChar,
        context,
        targetChar,
        fallbackStrategy
      );

      for (const [nextWordId, transScore] of candidates) {
        // If we get a SENTENCE_BREAK_ID, we need to add it and then find a word for this character
        if (nextWordId === SENTENCE_BREAK_ID) {
          // Add the sentence break
          const withBreak: BeamPath = {
            sequence: [...path.sequence, SENTENCE_BREAK_ID],
            score: currentScore + transScore
          };

          // Now get candidates for the current character as a sentence start
          const restartCandidates = getCandidates(
            model,
            bigramModel,
            wordsByChar,
            [SENTENCE_BREAK_ID], // Empty context for sentence start
            targetChar,
            fallbackStrategy
          );

          for (const [restartWordId, restartScore] of restartCandidates) {
            newBeam.push({
              sequence: [...withBreak.sequence, restartWordId],
              score: withBreak.score + restartScore
            });
          }
        } else {
          // Normal transition
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
 * @param bigramModel - Optional bigram model for fallback.
 * @param wordsByChar - Lookup object for words by first character.
 * @param targetChars - Sequence of required starting characters.
 * @param fallbackStrategy - Strategy to use when model has no transitions (default: SENTENCE_BREAK).
 * @returns The encoded sentence.
 */
export function encodeText(
  model: Model,
  bigramModel: BigramModel | null,
  wordsByChar: WordsByChar,
  targetChars: string[],
  fallbackStrategy: FallbackStrategy = FallbackStrategyEnum.SENTENCE_BREAK
): string {
  const results = encodeTextMultiple(
    model,
    bigramModel,
    wordsByChar,
    targetChars,
    BEAM_WIDTH,
    1,
    fallbackStrategy
  );
  return results[0].text;
}
