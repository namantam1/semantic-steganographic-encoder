import { SENTENCE_BREAK_ID } from '../constants';
import type { Model, BeamPath } from '../types';

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
