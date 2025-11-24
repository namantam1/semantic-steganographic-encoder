import { BEAM_WIDTH, SENTENCE_BREAK_ID } from '../constants';
import type {
  Model,
  BigramModel,
  WordsByChar,
  FallbackStrategy,
} from '../types';
import { FallbackStrategy as FallbackStrategyEnum, ModelType } from '../types';

/**
 * Cleans the secret text to get the sequence of target characters.
 * @param text - The input text.
 * @returns An array of lowercase characters.
 */
export function getTargetChars(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z]/g, '').split('');
}

/**
 * Helper function to get bigram candidates.
 * @param model - The bigram model.
 * @param currentWordId - ID of the current word.
 * @param targetChar - The required starting letter.
 * @returns List of [next_word_id, score].
 */
function getBigramCandidates(
  model: BigramModel,
  currentWordId: number,
  targetChar: string
): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];
  const currentIdStr = String(currentWordId);
  const transitions = model.map[currentIdStr];

  if (transitions && transitions[targetChar]) {
    const ids = transitions[targetChar];
    const baseScore = 0.0;
    ids.forEach((id, index) => {
      const score = baseScore - (index * 0.1);
      candidates.push([id, score]);
    });
  }

  return candidates;
}

/**
 * Finds valid next words using the Beam Search algorithm with support for both bigram and trigram models.
 * @param model - The N-gram model containing vocab and map.
 * @param bigramModel - Optional bigram model for fallback (required for BIGRAM_FALLBACK and BIGRAM_THEN_BREAK strategies).
 * @param wordsByChar - Lookup object for words by first character.
 * @param context - Array of previous word IDs (last 1-2 words, or empty for sentence start).
 * @param targetChar - The required starting letter of the next word.
 * @param fallbackStrategy - Strategy to use when primary model has no transitions.
 * @returns List of [next_word_id, log_probability_score].
 */
export function getCandidates(
  model: Model,
  bigramModel: BigramModel | null,
  wordsByChar: WordsByChar,
  context: number[],
  targetChar: string,
  fallbackStrategy: FallbackStrategy = FallbackStrategyEnum.SENTENCE_BREAK
): Array<[number, number]> {
  const candidates: Array<[number, number]> = [];

  // If we're starting a new sentence (empty context or last element is SENTENCE_BREAK_ID)
  if (context.length === 0 || context[context.length - 1] === SENTENCE_BREAK_ID) {
    const startWords = wordsByChar[targetChar] || [];
    startWords.slice(0, BEAM_WIDTH).forEach((wordId, index) => {
      const score = 0.0 - (index * 0.1);
      candidates.push([wordId, score]);
    });
    return candidates;
  }

  // Filter out SENTENCE_BREAK_IDs from context
  const validContext = context.filter(id => id !== SENTENCE_BREAK_ID);

  // Try primary model (bigram or trigram)
  if (model.type === ModelType.TRIGRAM) {
    // Trigram lookup: need at least 2 words
    if (validContext.length >= 2) {
      const word1Id = validContext[validContext.length - 2];
      const word2Id = validContext[validContext.length - 1];
      const word1Str = String(word1Id);
      const word2Str = String(word2Id);

      const level1 = model.map[word1Str];
      if (level1) {
        const level2 = level1[word2Str];
        if (level2 && level2[targetChar]) {
          const ids = level2[targetChar];
          const baseScore = 0.0;
          ids.forEach((id, index) => {
            const score = baseScore - (index * 0.1);
            candidates.push([id, score]);
          });
        }
      }
    }
    // If trigram failed (or only 1 word in context), try fallback
    if (candidates.length === 0 && validContext.length >= 1) {
      if (fallbackStrategy === FallbackStrategyEnum.BIGRAM_FALLBACK || fallbackStrategy === FallbackStrategyEnum.BIGRAM_THEN_BREAK) {
        // Try bigram fallback (only if bigramModel is provided)
        if (bigramModel) {
          const fallbackCandidates = getBigramCandidates(
            bigramModel,
            validContext[validContext.length - 1],
            targetChar
          );
          candidates.push(...fallbackCandidates);
        }
      }
    }
  } else {
    // Bigram lookup
    const currentWordId = validContext[validContext.length - 1];
    const bigramCandidates = getBigramCandidates(model as BigramModel, currentWordId, targetChar);
    candidates.push(...bigramCandidates);
  }

  // If still no candidates, apply sentence break
  if (candidates.length === 0) {
    if (fallbackStrategy === FallbackStrategyEnum.SENTENCE_BREAK || fallbackStrategy === FallbackStrategyEnum.BIGRAM_THEN_BREAK) {
      candidates.push([SENTENCE_BREAK_ID, -0.5]); // Small penalty for breaking sentence
    }
  }

  return candidates;
}
