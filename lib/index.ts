// Re-export all library functionality

// Constants
export { BEAM_WIDTH, SENTENCE_BREAK_ID } from './constants';

// Types
export type {
  Model,
  BigramModel,
  TrigramModel,
  WordsByChar,
  BeamPath,
} from './types';
export { ModelType, FallbackStrategy } from './types';

// Encoder
export {
  getTargetChars,
  getCandidates,
  isBigramModel,
  isTrigramModel,
  encodeText,
  encodeTextMultiple,
  pathToSentence,
} from './encoder';

// Decoder
export {
  decodeText,
  decodeAndSplit,
  splitIntoWords,
} from './decoder';
