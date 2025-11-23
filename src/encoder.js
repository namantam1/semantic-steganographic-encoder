const BEAM_WIDTH = 20;
const FALLBACK_PENALTY = -20.0; // Heavy penalty for using a non-bigram word

/**
 * Cleans the secret text to get the sequence of target characters.
 * @param {string} text - The input text.
 * @returns {string[]} An array of lowercase characters.
 */
export function getTargetChars(text) {
    return text.toLowerCase().replace(/[^a-z]/g, '').split('');
}

/**
 * Finds valid next words using the Beam Search algorithm.
 * @param {Object} model - The N-gram model containing vocab and map.
 * @param {Object} wordsByChar - Lookup object for words by first character.
 * @param {number} currentWordId - ID of the last word in the path.
 * @param {string} targetChar - The required starting letter of the next word.
 * @returns {Array<[number, number]>} List of [next_word_id, log_probability_score].
 */
export function getCandidates(model, wordsByChar, currentWordId, targetChar) {
    const currentIdStr = String(currentWordId);
    const candidates = [];

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

    // Strategy B: Fallback (If Strategy A found nothing or is first word)
    if (candidates.length === 0) {
        const fallbackWords = wordsByChar[targetChar] || [];
        // Apply a heavy penalty for breaking grammatical flow
        fallbackWords.slice(0, 5).forEach(wordId => {
            candidates.push([wordId, FALLBACK_PENALTY]);
        });
    }

    return candidates;
}

/**
 * Implements the Beam Search to find the best-scoring sentence.
 * @param {Object} model - The N-gram model containing vocab and map.
 * @param {Object} wordsByChar - Lookup object for words by first character.
 * @param {string[]} targetChars - Sequence of required starting characters.
 * @returns {string} The encoded sentence.
 */
export function encodeText(model, wordsByChar, targetChars) {
    if (!targetChars || targetChars.length === 0) return "";

    // Step 1: Initialize Beam with the first character
    const firstChar = targetChars[0];
    let beam = [];

    // Get initial candidates (uses fallback logic implicitly)
    const startCandidates = wordsByChar[firstChar] || [];
    startCandidates.slice(0, BEAM_WIDTH).forEach(w_id => {
        beam.push({
            sequence: [w_id],
            score: 0.0 // Start score is zero
        });
    });

    // Step 2: Iterate through the rest of the characters
    for (let char_idx = 1; char_idx < targetChars.length; char_idx++) {
        const targetChar = targetChars[char_idx];
        let newBeam = [];

        for (const path of beam) {
            const lastWordId = path.sequence[path.sequence.length - 1];
            const currentScore = path.score;

            const candidates = getCandidates(model, wordsByChar, lastWordId, targetChar);

            for (const [nextWordId, transScore] of candidates) {
                newBeam.push({
                    sequence: [...path.sequence, nextWordId],
                    score: currentScore + transScore
                });
            }
        }

        // Pruning: Sort by score (descending) and keep top K
        if (newBeam.length === 0) {
            // This happens if NO word could be found for the character (very rare)
            console.warn(`Dead end at character: ${targetChar}`);
            break;
        }

        newBeam.sort((a, b) => b.score - a.score);
        beam = newBeam.slice(0, BEAM_WIDTH);
    }

    // Step 3: Return best sentence
    if (beam.length === 0) return "Encoding failed: No valid path found.";

    const bestPath = beam[0];
    const decodedWords = bestPath.sequence.map(id => model.vocab[id]);

    // Capitalize first letter and add a period for style
    const sentence = decodedWords.join(" ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
}

/**
 * Splits a string into words using dynamic programming and the vocabulary.
 * @param {Object} model - The N-gram model containing vocab.
 * @param {string} text - The string to split (no spaces).
 * @returns {string} The text split into words with spaces.
 */
export function splitIntoWords(model, text) {
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
    const words = [];
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
 * @param {string} sentence - The encoded sentence.
 * @returns {string} The decoded message (raw character string).
 */
export function decodeText(sentence) {
    const words = sentence.toLowerCase().match(/[a-z]+/g) || [];
    return words.map(w => w[0]).join('');
}

/**
 * Decodes and splits the cover text into readable words.
 * @param {Object} model - The N-gram model containing vocab.
 * @param {string} sentence - The encoded sentence.
 * @returns {string} The decoded message split into words.
 */
export function decodeAndSplit(model, sentence) {
    const rawDecoded = decodeText(sentence);
    return splitIntoWords(model, rawDecoded);
}
