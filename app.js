const BEAM_WIDTH = 20;
const FALLBACK_PENALTY = -20.0; // Heavy penalty for using a non-bigram word

let model = null;
let wordsByChar = {}; // Used for the first word and fallback mechanism

const secretInput = document.getElementById('secretInput');
const encodeButton = document.getElementById('encodeButton');
const buttonText = document.getElementById('buttonText');
const loadingIndicator = document.getElementById('loadingIndicator');
const statusMessage = document.getElementById('statusMessage');
const coverTextOutput = document.getElementById('coverTextOutput');
const decodedVerification = document.getElementById('decodedVerification');
const decodedSplit = document.getElementById('decodedSplit');

/**
 * Loads the N-Gram model data from the JSON file.
 */
async function loadModel() {
    try {
        const response = await fetch('model_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // --- Data Processing for Efficiency ---
        model = {
            vocab: data.vocab,
            map: data.map // This is the transition graph: { 'current_id': { 'char': [next_ids] } }
        };

        // Create the fallback structure: { 'a': [id1, id2, ...], 'b': [...] }
        model.vocab.forEach((word, id) => {
            const char = word[0];
            if (!wordsByChar[char]) {
                wordsByChar[char] = [];
            }
            wordsByChar[char].push(id);
        });

        console.log(`Model loaded successfully. Vocab size: ${model.vocab.length}`);
        return true;

    } catch (error) {
        console.error("Error loading model:", error);
        statusMessage.textContent = "Error: Could not load model_data.json. Check console.";
        statusMessage.classList.remove('hidden');
        encodeButton.disabled = true;
        return false;
    }
}

/**
 * Cleans the secret text to get the sequence of target characters.
 * @param {string} text - The input text.
 * @returns {string[]} An array of lowercase characters.
 */
function getTargetChars(text) {
    return text.toLowerCase().replace(/[^a-z]/g, '').split('');
}

/**
 * Finds valid next words using the Beam Search algorithm.
 * @param {number} currentWordId - ID of the last word in the path.
 * @param {string} targetChar - The required starting letter of the next word.
 * @returns {Array<[number, number]>} List of [next_word_id, log_probability_score].
 */
function getCandidates(currentWordId, targetChar) {
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
 * @param {string[]} targetChars - Sequence of required starting characters.
 * @returns {string} The encoded sentence.
 */
function encodeText(targetChars) {
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

            const candidates = getCandidates(lastWordId, targetChar);

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
 * @param {string} text - The string to split (no spaces).
 * @returns {string} The text split into words with spaces.
 */
function splitIntoWords(text) {
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
function decodeText(sentence) {
    const words = sentence.toLowerCase().match(/[a-z]+/g) || [];
    return words.map(w => w[0]).join('');
}

/**
 * Decodes and splits the cover text into readable words.
 * @param {string} sentence - The encoded sentence.
 * @returns {string} The decoded message split into words.
 */
function decodeAndSplit(sentence) {
    const rawDecoded = decodeText(sentence);
    return splitIntoWords(rawDecoded);
}

/**
 * Main handler for the encode button click.
 */
async function handleEncode() {
    if (!model) {
        // Should only happen if initial load fails
        statusMessage.textContent = "Model not ready. Please refresh.";
        return;
    }

    const secret = secretInput.value.trim();
    if (secret.length === 0) {
        statusMessage.textContent = "Please enter a secret message.";
        statusMessage.classList.remove('hidden');
        return;
    }

    statusMessage.classList.add('hidden');
    encodeButton.disabled = true;
    buttonText.textContent = "Encoding...";
    loadingIndicator.classList.remove('hidden');

    const targetChars = getTargetChars(secret);

    // Execute encoding (use setTimeout to allow UI to update loading state)
    setTimeout(() => {
        const coverText = encodeText(targetChars);
        const decodedText = decodeText(coverText);
        const splitText = decodeAndSplit(coverText);

        coverTextOutput.textContent = coverText;
        decodedVerification.textContent = `Original: ${targetChars.join('')} | Decoded: ${decodedText}`;
        decodedSplit.textContent = splitText;

        if (targetChars.join('') === decodedText) {
            decodedVerification.classList.remove('text-red-700');
            decodedVerification.classList.add('text-green-700');
        } else {
            decodedVerification.classList.remove('text-green-700');
            decodedVerification.classList.add('text-red-700');
            console.error("Decoding error! Check if the corpus has enough transition data.");
        }

        encodeButton.disabled = false;
        buttonText.textContent = "Encode Message";
        loadingIndicator.classList.add('hidden');
    }, 10);
}

// --- Initialization ---
window.onload = async () => {
    const success = await loadModel();
    if (success) {
        encodeButton.disabled = false;
        // Run a test encoding on load for initial display
        handleEncode();
    }
};
