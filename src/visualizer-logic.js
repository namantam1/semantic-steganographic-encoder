import { getTargetChars, getCandidates } from './encoder.js';

const BEAM_WIDTH = 20;
const SENTENCE_BREAK_ID = -1;

/**
 * Initialize beam search for algorithm mode
 * @param {string[]} targetChars - Array of target characters to encode
 * @param {Object} wordsByChar - Lookup of word IDs by starting character
 * @param {string} mode - 'algorithm' or 'manual'
 * @returns {Object} Initial beam state with beam array and step number
 */
export function initializeBeam(targetChars, wordsByChar, mode) {
    if (targetChars.length === 0) {
        return { beam: [], step: 0 };
    }

    const firstChar = targetChars[0];
    const startCandidates = wordsByChar[firstChar] || [];
    const beam = startCandidates.slice(0, BEAM_WIDTH).map(w_id => ({
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
 * @param {Object[]} algorithmBeam - Current algorithm beam
 * @param {string} mode - 'algorithm' or 'manual'
 * @returns {Object} Initial user path with sequence and score
 */
export function initializeUserPath(algorithmBeam, mode) {
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
 * @param {Object[]} beam - Current beam paths
 * @param {string[]} targetChars - Array of target characters
 * @param {number} step - Current step index
 * @param {Object} modelData - Model data with vocab and transition map
 * @param {Object} wordsByChar - Lookup of word IDs by starting character
 * @returns {Object[]} New beam after expanding
 */
export function performBeamStep(beam, targetChars, step, modelData, wordsByChar) {
    if (step >= targetChars.length) {
        return beam;
    }

    const targetChar = targetChars[step];
    let newBeam = [];

    for (const path of beam) {
        const lastWordId = path.sequence[path.sequence.length - 1];
        const currentScore = path.score;

        const candidates = getCandidates(modelData, wordsByChar, lastWordId, targetChar);

        for (const [nextWordId, transScore] of candidates) {
            if (nextWordId === SENTENCE_BREAK_ID) {
                const withBreak = {
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
 * @param {Object} path - Current path with sequence and score
 * @param {string[]} targetChars - Array of target characters
 * @param {number} step - Current step index
 * @param {Object} modelData - Model data with vocab and transition map
 * @param {Object} wordsByChar - Lookup of word IDs by starting character
 * @param {string} mode - 'algorithm' or 'manual'
 * @returns {Array} Array of [wordId, score] pairs
 */
export function getStepCandidates(path, targetChars, step, modelData, wordsByChar, mode) {
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
 * @param {Object} userPath - Current user path
 * @param {number} wordId - Selected word ID
 * @param {number} score - Score of the selected word
 * @param {number} currentStep - Current step index
 * @returns {Object} Updated state with newPath, newStep, shouldAdvanceAlgorithm
 */
export function handleWordSelection(userPath, wordId, score, currentStep) {
    const newPath = {
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
 * @param {number[]} sequence - Array of word IDs
 * @param {string[]} vocab - Vocabulary array
 * @returns {string} Formatted sentence(s)
 */
export function sequenceToSentence(sequence, vocab) {
    const sentences = [];
    let currentSentence = [];

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
 * @param {string} message - Secret message to validate
 * @returns {Object} Validation result with isValid and error message
 */
export function validateMessage(message) {
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
