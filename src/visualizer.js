import { getTargetChars } from './encoder.js';
import {
    initializeBeam,
    initializeUserPath,
    performBeamStep,
    getStepCandidates,
    handleWordSelection,
    sequenceToSentence as convertSequenceToSentence,
    validateMessage
} from './visualizer-logic.js';

const BEAM_WIDTH = 20;
const DISPLAY_BEAMS = 3; // Show top 3 beams in UI
const SENTENCE_BREAK_ID = -1;

// Global state
let modelData = null;
let wordsByChar = null;
let targetChars = [];
let currentMode = 'algorithm'; // 'algorithm' or 'manual'
let currentStep = 0;
let isPlaying = false;
let playInterval = null;

// Algorithm state
let algorithmHistory = []; // History of beam states at each step
let algorithmBeam = [];

// Manual mode state
let userPath = { sequence: [], score: 0.0 };
let userHistory = []; // History of user choices

// Load model data
async function loadModel() {
    try {
        const response = await fetch('model_data.json');
        modelData = await response.json();

        // Build wordsByChar lookup
        wordsByChar = {};
        modelData.vocab.forEach((word, idx) => {
            const firstChar = word[0];
            if (!wordsByChar[firstChar]) {
                wordsByChar[firstChar] = [];
            }
            wordsByChar[firstChar].push(idx);
        });

        console.log('Model loaded:', {
            vocabSize: modelData.vocab.length,
            wordsByCharKeys: Object.keys(wordsByChar).length
        });

        return true;
    } catch (error) {
        console.error('Error loading model:', error);
        alert('Failed to load model data');
        return false;
    }
}

// Initialize encoding session
function initializeEncoding(secretMessage) {
    const validation = validateMessage(secretMessage);

    if (!validation.isValid) {
        alert(validation.error);
        return false;
    }

    targetChars = validation.targetChars;
    algorithmHistory = [];
    userHistory = [];

    // Initialize beam using extracted logic
    const beamInit = initializeBeam(targetChars, wordsByChar, currentMode);
    algorithmBeam = beamInit.beam;
    currentStep = beamInit.step;

    algorithmHistory.push(JSON.parse(JSON.stringify(algorithmBeam))); // Deep copy

    // Initialize user path using extracted logic
    userPath = initializeUserPath(algorithmBeam, currentMode);
    userHistory.push(JSON.parse(JSON.stringify(userPath)));

    return true;
}

// Perform one step of beam search
// Note: This function does NOT increment currentStep
// Callers are responsible for managing currentStep
function algorithmStep() {
    if (currentStep >= targetChars.length) return;

    algorithmBeam = performBeamStep(algorithmBeam, targetChars, currentStep, modelData, wordsByChar);
    algorithmHistory.push(JSON.parse(JSON.stringify(algorithmBeam)));
}

// Get candidates for current step (for UI display)
function getCurrentCandidates(path) {
    return getStepCandidates(path, targetChars, currentStep, modelData, wordsByChar, currentMode);
}

// Convert sequence to readable sentence
function sequenceToSentence(sequence) {
    return convertSequenceToSentence(sequence, modelData.vocab);
}

// Render character progress
function renderCharacterProgress() {
    const container = document.getElementById('charProgress');
    container.innerHTML = '';

    targetChars.forEach((char, idx) => {
        const charBox = document.createElement('div');
        charBox.className = 'char-box';

        if (idx < currentStep) {
            charBox.classList.add('completed');
        } else if (idx === currentStep) {
            charBox.classList.add('current');
        } else {
            charBox.classList.add('pending');
        }

        charBox.textContent = char;
        container.appendChild(charBox);
    });

    const stepInfo = document.getElementById('stepInfo');
    stepInfo.textContent = `Encoding character ${currentStep + 1} of ${targetChars.length}: "${targetChars[currentStep] || 'Complete'}"`;
}

// Render beam paths with word candidates
function renderBeams() {
    const beamsList = document.getElementById('beamsList');
    beamsList.innerHTML = '';

    // In manual mode, show user's path; in algorithm mode, show top 3 beams
    if (currentMode === 'manual') {
        // Display user's path
        const beamCard = document.createElement('div');
        beamCard.className = 'beam-card user-path';

        // Beam header with rank and score
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-2';
        header.innerHTML = `
            <div>
                <span class="text-sm font-semibold text-gray-800">Your Path</span>
            </div>
            <span class="score-badge text-xs" style="background-color: #d1fae5; color: #065f46;">Score: ${userPath.score.toFixed(2)}</span>
        `;
        beamCard.appendChild(header);

        // Current sentence built so far
        const sentenceDiv = document.createElement('div');
        sentenceDiv.className = 'sentence-display mb-2';
        sentenceDiv.textContent = sequenceToSentence(userPath.sequence) || '(start encoding)';
        beamCard.appendChild(sentenceDiv);

        // Show next word candidates if not at end
        if (currentStep < targetChars.length) {
            const candidatesLabel = document.createElement('div');
            candidatesLabel.className = 'text-xs font-semibold text-gray-700 mb-2';
            candidatesLabel.textContent = `Choose next word for "${targetChars[currentStep]}":`;
            beamCard.appendChild(candidatesLabel);

            const candidatesContainer = document.createElement('div');
            candidatesContainer.className = 'flex flex-wrap gap-1';

            const candidates = getCurrentCandidates(userPath);
            const displayCandidates = candidates.slice(0, 8); // Show top 8

            displayCandidates.forEach(([wordId, score]) => {
                const wordBox = document.createElement('div');
                wordBox.className = 'word-candidate';

                if (wordId === SENTENCE_BREAK_ID) {
                    wordBox.textContent = '⏎ Break';
                    wordBox.style.fontStyle = 'italic';
                    wordBox.style.fontSize = '0.75rem';
                } else {
                    const word = modelData.vocab[wordId];
                    wordBox.innerHTML = `
                        <span>${word}</span>
                        <span style="font-size: 0.65rem; color: #9ca3af; margin-left: 0.375rem;">${score.toFixed(1)}</span>
                    `;
                }

                // Make candidates clickable in manual mode
                wordBox.style.cursor = 'pointer';
                wordBox.addEventListener('click', () => selectWord(wordId, score));

                candidatesContainer.appendChild(wordBox);
            });

            beamCard.appendChild(candidatesContainer);
        }

        beamsList.appendChild(beamCard);
    } else {
        // Algorithm mode: show top 3 beams
        const beamsToDisplay = algorithmBeam.slice(0, DISPLAY_BEAMS);

        beamsToDisplay.forEach((path, beamIdx) => {
            const beamCard = document.createElement('div');
            beamCard.className = 'beam-card';

            if (beamIdx === 0) {
                beamCard.classList.add('best');
            }

            // Beam header with rank and score
            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-2';
            header.innerHTML = `
                <div>
                    <span class="text-sm font-semibold text-gray-800">Beam #${beamIdx + 1}</span>
                    ${beamIdx === 0 ? '<span class="ml-2 text-xs text-blue-600 font-semibold">★ Best</span>' : ''}
                </div>
                <span class="score-badge text-xs">Score: ${path.score.toFixed(2)}</span>
            `;
            beamCard.appendChild(header);

            // Current sentence built so far
            const sentenceDiv = document.createElement('div');
            sentenceDiv.className = 'sentence-display mb-2';
            sentenceDiv.textContent = sequenceToSentence(path.sequence) || '(empty)';
            beamCard.appendChild(sentenceDiv);

            // Show next word candidates if not at end
            if (currentStep < targetChars.length) {
                const candidatesLabel = document.createElement('div');
                candidatesLabel.className = 'text-xs font-semibold text-gray-700 mb-2';
                candidatesLabel.textContent = `Next candidates for "${targetChars[currentStep]}":`;
                beamCard.appendChild(candidatesLabel);

                const candidatesContainer = document.createElement('div');
                candidatesContainer.className = 'flex flex-wrap gap-1';

                const candidates = getCurrentCandidates(path);
                const displayCandidates = candidates.slice(0, 8); // Show top 8

                displayCandidates.forEach(([wordId, score]) => {
                    const wordBox = document.createElement('div');
                    wordBox.className = 'word-candidate';

                    if (wordId === SENTENCE_BREAK_ID) {
                        wordBox.textContent = '⏎ Break';
                        wordBox.style.fontStyle = 'italic';
                        wordBox.style.fontSize = '0.75rem';
                    } else {
                        const word = modelData.vocab[wordId];
                        wordBox.innerHTML = `
                            <span>${word}</span>
                            <span style="font-size: 0.65rem; color: #9ca3af; margin-left: 0.375rem;">${score.toFixed(1)}</span>
                        `;
                    }

                    candidatesContainer.appendChild(wordBox);
                });

                beamCard.appendChild(candidatesContainer);
            }

            beamsList.appendChild(beamCard);
        });
    }
}

// Render manual mode comparison
function renderComparison() {
    if (currentMode !== 'manual') return;

    const algorithmPathDiv = document.getElementById('algorithmPath');
    const userPathDiv = document.getElementById('userPath');
    const algorithmScoreSpan = document.getElementById('algorithmScore');
    const userScoreSpan = document.getElementById('userScore');

    const algorithmBest = algorithmBeam[0];

    algorithmPathDiv.textContent = sequenceToSentence(algorithmBest.sequence) || '(empty)';
    algorithmScoreSpan.textContent = algorithmBest.score.toFixed(2);

    userPathDiv.textContent = sequenceToSentence(userPath.sequence) || '(empty)';
    userScoreSpan.textContent = userPath.score.toFixed(2);
}

// Handle word selection in manual mode
function selectWord(wordId, score) {
    if (currentMode !== 'manual') return;

    const result = handleWordSelection(userPath, wordId, score, currentStep);

    // Advance algorithm BEFORE updating currentStep, but skip the first selection
    // On first selection (currentStep == 0), algorithm beam already has candidates for first char
    // On subsequent selections, we need to advance the algorithm to keep it in sync
    if (result.shouldAdvanceAlgorithm && currentStep > 0 && currentStep < targetChars.length) {
        algorithmStep(); // This uses the OLD currentStep (before user advances)
    }

    // Now update user path and step
    userPath = result.newPath;
    currentStep = result.newStep;

    userHistory.push(JSON.parse(JSON.stringify(userPath)));

    // Re-render
    renderCharacterProgress();
    renderBeams();
    renderComparison();
    updateControls();

    if (currentStep >= targetChars.length) {
        stopPlaying();
    }
}

// Next step handler
function nextStep() {
    if (currentStep < targetChars.length) {
        if (currentMode === 'algorithm') {
            algorithmStep();
            currentStep++; // Increment step in algorithm mode
        } else {
            // In manual mode, Next button should be disabled until user selects a word
            // So this code should not execute in manual mode
            return;
        }

        renderCharacterProgress();
        renderBeams();
        renderComparison();
        updateControls();
    }

    if (currentStep >= targetChars.length) {
        stopPlaying();
        updateControls();
    }
}

// Previous step handler
function previousStep() {
    if (currentStep > 0) {
        currentStep--;

        // Restore algorithm state
        algorithmBeam = JSON.parse(JSON.stringify(algorithmHistory[currentStep]));

        // Restore user state
        if (currentMode === 'manual') {
            userPath = JSON.parse(JSON.stringify(userHistory[currentStep]));
        }

        renderCharacterProgress();
        renderBeams();
        renderComparison();
        updateControls();
    }
}

// Play/Pause handlers
function startPlaying() {
    if (isPlaying) return;

    isPlaying = true;
    document.getElementById('playButton').classList.add('hidden');
    document.getElementById('pauseButton').classList.remove('hidden');

    playInterval = setInterval(() => {
        if (currentStep >= targetChars.length) {
            stopPlaying();
        } else {
            nextStep();
        }
    }, 1500); // Auto-advance every 1.5 seconds
}

function stopPlaying() {
    isPlaying = false;
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
    document.getElementById('playButton').classList.remove('hidden');
    document.getElementById('pauseButton').classList.add('hidden');
}

// Update control button states
function updateControls() {
    const prevBtn = document.getElementById('prevButton');
    const nextBtn = document.getElementById('nextButton');
    const playBtn = document.getElementById('playButton');
    const pauseBtn = document.getElementById('pauseButton');

    prevBtn.disabled = currentStep === 0;

    // In manual mode, disable Next/Play until user selects a word for current step
    if (currentMode === 'manual') {
        const userHasSelectedForCurrentStep = userHistory.length > currentStep + 1;
        nextBtn.disabled = !userHasSelectedForCurrentStep || currentStep >= targetChars.length;
        playBtn.disabled = true; // Disable play in manual mode
        pauseBtn.disabled = true;
    } else {
        nextBtn.disabled = currentStep >= targetChars.length;
        playBtn.disabled = currentStep >= targetChars.length;
        pauseBtn.disabled = currentStep >= targetChars.length;
    }

    const instructionText = document.getElementById('instructionText');
    if (currentStep >= targetChars.length) {
        instructionText.textContent = '✨ Encoding complete! Use "Previous" to review steps.';
    } else if (currentMode === 'manual') {
        instructionText.textContent = 'Click on a word candidate to select it and continue encoding';
    } else {
        instructionText.textContent = 'Click "Next" to proceed to the next character, or "Play" to auto-advance';
    }
}

// Start encoding handler
function startEncoding() {
    const secretMessage = document.getElementById('secretInput').value;

    if (!initializeEncoding(secretMessage)) {
        return;
    }

    // Show all sections
    document.getElementById('progressSection').classList.remove('hidden');
    document.getElementById('beamsSection').classList.remove('hidden');
    document.getElementById('controlsSection').classList.remove('hidden');

    if (currentMode === 'manual') {
        document.getElementById('comparisonSection').classList.remove('hidden');
    } else {
        document.getElementById('comparisonSection').classList.add('hidden');
    }

    renderCharacterProgress();
    renderBeams();
    renderComparison();
    updateControls();
}

// Reset handler
function resetEncoding() {
    stopPlaying();
    currentStep = 0;
    algorithmHistory = [];
    algorithmBeam = [];
    userPath = { sequence: [], score: 0.0 };
    userHistory = [];

    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('beamsSection').classList.add('hidden');
    document.getElementById('controlsSection').classList.add('hidden');
    document.getElementById('comparisonSection').classList.add('hidden');
}

// Mode switch handler
function switchMode(mode) {
    currentMode = mode;

    document.getElementById('modeAlgorithm').classList.toggle('active', mode === 'algorithm');
    document.getElementById('modeManual').classList.toggle('active', mode === 'manual');

    if (currentStep > 0) {
        // If already started, show/hide comparison panel
        if (mode === 'manual') {
            document.getElementById('comparisonSection').classList.remove('hidden');
        } else {
            document.getElementById('comparisonSection').classList.add('hidden');
        }

        renderBeams();
        renderComparison();
        updateControls();
    }
}

// Initialize the app
async function init() {
    const loaded = await loadModel();

    if (!loaded) {
        return;
    }

    // Event listeners
    document.getElementById('startButton').addEventListener('click', startEncoding);
    document.getElementById('resetButton').addEventListener('click', resetEncoding);
    document.getElementById('nextButton').addEventListener('click', nextStep);
    document.getElementById('prevButton').addEventListener('click', previousStep);
    document.getElementById('playButton').addEventListener('click', startPlaying);
    document.getElementById('pauseButton').addEventListener('click', stopPlaying);

    document.getElementById('modeAlgorithm').addEventListener('click', () => switchMode('algorithm'));
    document.getElementById('modeManual').addEventListener('click', () => switchMode('manual'));

    // Allow Enter key to start encoding
    document.getElementById('secretInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startEncoding();
        }
    });

    console.log('Interactive visualizer ready');
}

// Start the app
init();
