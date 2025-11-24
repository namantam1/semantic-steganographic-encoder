import type { Model } from '../types';
import { splitIntoWords } from './word-splitter';

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
