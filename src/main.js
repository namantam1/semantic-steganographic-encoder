import './style.css';
import {
    getTargetChars,
    encodeText,
    decodeText,
    decodeAndSplit
} from './encoder.js';

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
 * Main handler for the encode button click.
 */
export async function handleEncode() {
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
        const coverText = encodeText(model, wordsByChar, targetChars);
        const decodedText = decodeText(coverText);
        const splitText = decodeAndSplit(model, coverText);

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
(async () => {
    const success = await loadModel();
    if (success) {
        encodeButton.disabled = false;
        // Run a test encoding on load for initial display
        handleEncode();
    }
})();

// Make handleEncode available globally for inline onclick handler
window.handleEncode = handleEncode;
