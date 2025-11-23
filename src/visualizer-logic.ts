import { getTargetChars, getCandidates, Model, WordsByChar } from './encoder';

// Re-export types for component use
export type { Model, WordsByChar };

const BEAM_WIDTH = 20;
const SENTENCE_BREAK_ID = -1;

export interface BeamPath {
  sequence: number[];
  score: number;
}

export interface InitBeamResult {
  beam: BeamPath[];
  step: number;
}

export interface UserPath {
  sequence: number[];
  score: number;
}

export interface WordSelectionResult {
  newPath: UserPath;
  newStep: number;
  shouldAdvanceAlgorithm: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  targetChars?: string[];
}

/**
 * Initialize beam search for algorithm mode
 * @param targetChars - Array of target characters to encode
 * @param wordsByChar - Lookup of word IDs by starting character
 * @param mode - 'algorithm' or 'manual'
 * @returns Initial beam state with beam array and step number
 */
export function initializeBeam(
  targetChars: string[],
  wordsByChar: WordsByChar,
  mode: string
): InitBeamResult {
  if (targetChars.length === 0) {
    return { beam: [], step: 0 };
  }

  const firstChar = targetChars[0];
  const startCandidates = wordsByChar[firstChar] || [];
  const beam: BeamPath[] = startCandidates.slice(0, BEAM_WIDTH).map(w_id => ({
    sequence: [w_id],
    score: 0.0
  }));

  // In algorithm mode, first character is already encoded (step 1)
  // In manual mode, user needs to pick first word (step 0)
  const step = mode === 'algorithm' ? 1 : 0;

  return { beam, step };
}

/**
 * Initialize user path for manual mode
 * @param algorithmBeam - Current algorithm beam
 * @param mode - 'algorithm' or 'manual'
 * @returns Initial user path with sequence and score
 */
export function initializeUserPath(algorithmBeam: BeamPath[], mode: string): UserPath {
  if (mode === 'algorithm' && algorithmBeam.length > 0) {
    // In algorithm mode, initialize user path to match first beam
    return {
      sequence: [algorithmBeam[0].sequence[0]],
      score: 0.0
    };
  }
  // In manual mode, start empty
  return { sequence: [], score: 0.0 };
}

/**
 * Perform one step of beam search
 * @param beam - Current beam paths
 * @param targetChars - Array of target characters
 * @param step - Current step index
 * @param modelData - Model data with vocab and transition map
 * @param wordsByChar - Lookup of word IDs by starting character
 * @returns New beam after expanding
 */
export function performBeamStep(
  beam: BeamPath[],
  targetChars: string[],
  step: number,
  modelData: Model,
  wordsByChar: WordsByChar
): BeamPath[] {
  if (step >= targetChars.length) {
    return beam;
  }

  const targetChar = targetChars[step];
  let newBeam: BeamPath[] = [];

  for (const path of beam) {
    const lastWordId = path.sequence[path.sequence.length - 1];
    const currentScore = path.score;

    const candidates = getCandidates(modelData, wordsByChar, lastWordId, targetChar);

    for (const [nextWordId, transScore] of candidates) {
      if (nextWordId === SENTENCE_BREAK_ID) {
        const withBreak: BeamPath = {
          sequence: [...path.sequence, SENTENCE_BREAK_ID],
          score: currentScore + transScore
        };

        const restartCandidates = getCandidates(modelData, wordsByChar, SENTENCE_BREAK_ID, targetChar);

        for (const [restartWordId, restartScore] of restartCandidates) {
          newBeam.push({
            sequence: [...withBreak.sequence, restartWordId],
            score: withBreak.score + restartScore
          });
        }
      } else {
        newBeam.push({
          sequence: [...path.sequence, nextWordId],
          score: currentScore + transScore
        });
      }
    }
  }

  if (newBeam.length === 0) {
    console.warn(`Dead end at step ${step}, character: ${targetChar}`);
    return beam; // Return unchanged beam
  }

  newBeam.sort((a, b) => b.score - a.score);
  return newBeam.slice(0, BEAM_WIDTH);
}

/**
 * Get candidate words for the current step
 * @param path - Current path with sequence and score
 * @param targetChars - Array of target characters
 * @param step - Current step index
 * @param modelData - Model data with vocab and transition map
 * @param wordsByChar - Lookup of word IDs by starting character
 * @param mode - 'algorithm' or 'manual'
 * @returns Array of [wordId, score] pairs
 */
export function getStepCandidates(
  path: BeamPath | UserPath,
  targetChars: string[],
  step: number,
  modelData: Model,
  wordsByChar: WordsByChar,
  mode: string
): Array<[number, number]> {
  if (step >= targetChars.length) {
    return [];
  }

  const targetChar = targetChars[step];

  // In manual mode at step 0, or if path is empty, get sentence-start candidates
  if (mode === 'manual' && (step === 0 || path.sequence.length === 0)) {
    const startWords = wordsByChar[targetChar] || [];
    return startWords.slice(0, BEAM_WIDTH).map((wordId, index) => {
      const score = 0.0 - (index * 0.1);
      return [wordId, score];
    });
  }

  const lastWordId = path.sequence.length > 0
    ? path.sequence[path.sequence.length - 1]
    : SENTENCE_BREAK_ID;

  return getCandidates(modelData, wordsByChar, lastWordId, targetChar);
}

/**
 * Handle word selection in manual mode
 * @param userPath - Current user path
 * @param wordId - Selected word ID
 * @param score - Score of the selected word
 * @param currentStep - Current step index
 * @returns Updated state with newPath, newStep, shouldAdvanceAlgorithm
 */
export function handleWordSelection(
  userPath: UserPath,
  wordId: number,
  score: number,
  currentStep: number
): WordSelectionResult {
  const newPath: UserPath = {
    sequence: [...userPath.sequence, wordId],
    score: userPath.score + score
  };

  // If this was NOT a sentence break, advance to next character
  const shouldAdvanceChar = wordId !== SENTENCE_BREAK_ID;
  const newStep = shouldAdvanceChar ? currentStep + 1 : currentStep;

  return {
    newPath,
    newStep,
    shouldAdvanceAlgorithm: shouldAdvanceChar
  };
}

/**
 * Convert sequence of word IDs to readable sentence
 * @param sequence - Array of word IDs
 * @param vocab - Vocabulary array
 * @returns Formatted sentence(s)
 */
export function sequenceToSentence(sequence: number[], vocab: string[]): string {
  const sentences: string[] = [];
  let currentSentence: string[] = [];

  for (const id of sequence) {
    if (id === SENTENCE_BREAK_ID) {
      if (currentSentence.length > 0) {
        const sentence = currentSentence.join(" ");
        const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
        sentences.push(capitalized + ".");
        currentSentence = [];
      }
    } else {
      currentSentence.push(vocab[id]);
    }
  }

  if (currentSentence.length > 0) {
    const sentence = currentSentence.join(" ");
    const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    sentences.push(capitalized + ".");
  }

  return sentences.join(" ");
}

/**
 * Validate secret message
 * @param message - Secret message to validate
 * @returns Validation result with isValid and error message
 */
export function validateMessage(message: string): ValidationResult {
  const targetChars = getTargetChars(message);

  if (targetChars.length === 0) {
    return {
      isValid: false,
      error: 'Please enter a valid message (only a-z letters will be encoded)'
    };
  }

  if (targetChars.length > 20) {
    return {
      isValid: false,
      error: 'Message too long (max 20 characters)'
    };
  }

  return { isValid: true, targetChars };
}

export { SENTENCE_BREAK_ID };
