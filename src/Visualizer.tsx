import { useState, useEffect, useRef } from 'react';
import './style.css';
import './visualizer.css';
import { Model, WordsByChar } from './encoder';
import {
  initializeBeam,
  initializeUserPath,
  performBeamStep,
  getStepCandidates,
  handleWordSelection as handleWordSelectionLogic,
  sequenceToSentence,
  validateMessage,
  BeamPath,
  UserPath,
  SENTENCE_BREAK_ID,
} from './visualizer-logic';

const DISPLAY_BEAMS = 3;

// ModeToggle Component
interface ModeToggleProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        className={currentMode === 'algorithm' ? 'active text-sm' : 'text-sm'}
        onClick={() => onModeChange('algorithm')}
      >
        Algorithm
      </button>
      <button
        className={currentMode === 'manual' ? 'active text-sm' : 'text-sm'}
        onClick={() => onModeChange('manual')}
      >
        Manual
      </button>
    </div>
  );
}

// InputSection Component
interface InputSectionProps {
  secretText: string;
  onSecretChange: (text: string) => void;
  onStart: () => void;
  onReset: () => void;
  currentMode: string;
  onModeChange: (mode: string) => void;
}

function InputSection({
  secretText,
  onSecretChange,
  onStart,
  onReset,
  currentMode,
  onModeChange,
}: InputSectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onStart();
    }
  };

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Secret Message</h2>
        <ModeToggle currentMode={currentMode} onModeChange={onModeChange} />
      </div>

      <input
        type="text"
        value={secretText}
        onChange={(e) => onSecretChange(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={20}
        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800 mb-3"
        placeholder="Enter text to encode (max 20 characters)"
      />

      <div className="flex gap-2">
        <button onClick={onStart} className="control-btn primary text-sm flex-1">
          Start
        </button>
        <button onClick={onReset} className="control-btn secondary text-sm flex-1">
          Reset
        </button>
      </div>
    </div>
  );
}

// CharacterProgress Component
interface CharacterProgressProps {
  targetChars: string[];
  currentStep: number;
  show: boolean;
}

function CharacterProgress({ targetChars, currentStep, show }: CharacterProgressProps) {
  if (!show) return null;

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Progress</h2>
      <div className="flex flex-wrap items-center">
        {targetChars.map((char, idx) => {
          let className = 'char-box';
          if (idx < currentStep) className += ' completed';
          else if (idx === currentStep) className += ' current';
          else className += ' pending';

          return (
            <div key={idx} className={className}>
              {char}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-gray-600">
        <div>
          Encoding character {currentStep + 1} of {targetChars.length}:{' '}
          "{targetChars[currentStep] || 'Complete'}"
        </div>
      </div>
    </div>
  );
}

// StepControls Component
interface StepControlsProps {
  show: boolean;
  currentStep: number;
  targetLength: number;
  currentMode: string;
  userHistoryLength: number;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlay: () => void;
  onPause: () => void;
}

function StepControls({
  show,
  currentStep,
  targetLength,
  currentMode,
  userHistoryLength,
  isPlaying,
  onPrev,
  onNext,
  onPlay,
  onPause,
}: StepControlsProps) {
  if (!show) return null;

  const prevDisabled = currentStep === 0;
  const userHasSelectedForCurrentStep = userHistoryLength > currentStep + 1;
  const nextDisabled =
    currentMode === 'manual'
      ? !userHasSelectedForCurrentStep || currentStep >= targetLength
      : currentStep >= targetLength;
  const playDisabled = currentMode === 'manual' || currentStep >= targetLength;

  let instructionText = '';
  if (currentStep >= targetLength) {
    instructionText = '✨ Encoding complete! Use "Previous" to review steps.';
  } else if (currentMode === 'manual') {
    instructionText = 'Click on a word candidate to select it and continue encoding';
  } else {
    instructionText = 'Click "Next" to proceed to the next character, or "Play" to auto-advance';
  }

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Controls</h2>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={onPrev} disabled={prevDisabled} className="control-btn secondary text-sm">
          ← Prev
        </button>
        <button onClick={onNext} disabled={nextDisabled} className="control-btn primary text-sm">
          Next →
        </button>
        {!isPlaying ? (
          <button onClick={onPlay} disabled={playDisabled} className="control-btn primary text-sm">
            ▶ Play
          </button>
        ) : (
          <button onClick={onPause} className="control-btn secondary text-sm">
            ⏸ Pause
          </button>
        )}
      </div>
      <div className="text-xs text-gray-600">
        <p>{instructionText}</p>
      </div>
    </div>
  );
}

// BeamVisualization Component
interface BeamVisualizationProps {
  show: boolean;
  currentMode: string;
  algorithmBeam: BeamPath[];
  userPath: UserPath;
  targetChars: string[];
  currentStep: number;
  modelData: Model | null;
  wordsByChar: WordsByChar;
  onWordSelect?: (wordId: number, score: number) => void;
}

function BeamVisualization({
  show,
  currentMode,
  algorithmBeam,
  userPath,
  targetChars,
  currentStep,
  modelData,
  wordsByChar,
  onWordSelect,
}: BeamVisualizationProps) {
  if (!show || !modelData) return null;

  const renderWordCandidates = (
    candidates: Array<[number, number]>,
    clickable: boolean
  ) => {
    const displayCandidates = candidates.slice(0, 8);

    return (
      <div className="flex flex-wrap gap-1">
        {displayCandidates.map(([wordId, score], idx) => {
          const isBreak = wordId === SENTENCE_BREAK_ID;
          const word = isBreak ? null : modelData.vocab[wordId];

          return (
            <div
              key={idx}
              className="word-candidate"
              style={{
                cursor: clickable ? 'pointer' : 'default',
                fontStyle: isBreak ? 'italic' : 'normal',
                fontSize: isBreak ? '0.75rem' : '0.875rem',
              }}
              onClick={() => clickable && onWordSelect?.(wordId, score)}
            >
              {isBreak ? (
                '⏎ Break'
              ) : (
                <>
                  <span>{word}</span>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginLeft: '0.375rem' }}>
                    {score.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (currentMode === 'manual') {
    const candidates = getStepCandidates(
      userPath,
      targetChars,
      currentStep,
      modelData,
      wordsByChar,
      currentMode
    );

    return (
      <div className="container-card bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Top Beam Paths <span className="text-xs font-normal text-gray-600">(best 3)</span>
          </h2>
        </div>
        <div className="space-y-3">
          <div className="beam-card user-path">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-semibold text-gray-800">Your Path</span>
              </div>
              <span
                className="score-badge text-xs"
                style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
              >
                Score: {userPath.score.toFixed(2)}
              </span>
            </div>

            <div className="sentence-display mb-2">
              {sequenceToSentence(userPath.sequence, modelData.vocab) || '(start encoding)'}
            </div>

            {currentStep < targetChars.length && (
              <>
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  Choose next word for "{targetChars[currentStep]}":
                </div>
                {renderWordCandidates(candidates, true)}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Algorithm mode - show top 3 beams
  const beamsToDisplay = algorithmBeam.slice(0, DISPLAY_BEAMS);

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Top Beam Paths <span className="text-xs font-normal text-gray-600">(best 3)</span>
        </h2>
      </div>
      <div className="space-y-3">
        {beamsToDisplay.map((path, beamIdx) => {
          const candidates = getStepCandidates(
            path,
            targetChars,
            currentStep,
            modelData,
            wordsByChar,
            currentMode
          );

          return (
            <div key={beamIdx} className={`beam-card ${beamIdx === 0 ? 'best' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-gray-800">Beam #{beamIdx + 1}</span>
                  {beamIdx === 0 && (
                    <span className="ml-2 text-xs text-blue-600 font-semibold">★ Best</span>
                  )}
                </div>
                <span className="score-badge text-xs">Score: {path.score.toFixed(2)}</span>
              </div>

              <div className="sentence-display mb-2">
                {sequenceToSentence(path.sequence, modelData.vocab) || '(empty)'}
              </div>

              {currentStep < targetChars.length && (
                <>
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Next candidates for "{targetChars[currentStep]}":
                  </div>
                  {renderWordCandidates(candidates, false)}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ComparisonPanel Component
interface ComparisonPanelProps {
  show: boolean;
  algorithmBeam: BeamPath[];
  userPath: UserPath;
  modelData: Model | null;
}

function ComparisonPanel({ show, algorithmBeam, userPath, modelData }: ComparisonPanelProps) {
  if (!show || !modelData || algorithmBeam.length === 0) return null;

  const algorithmBest = algorithmBeam[0];

  return (
    <div className="comparison-panel p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">📊 Comparison</h2>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Algorithm:</h3>
          <div className="sentence-display bg-white text-sm p-2">
            {sequenceToSentence(algorithmBest.sequence, modelData.vocab) || '(empty)'}
          </div>
          <div className="mt-1">
            <span className="score-badge text-xs">Score: {algorithmBest.score.toFixed(2)}</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Your Path:</h3>
          <div className="sentence-display bg-white text-sm p-2">
            {sequenceToSentence(userPath.sequence, modelData.vocab) || '(empty)'}
          </div>
          <div className="mt-1">
            <span
              className="score-badge text-xs"
              style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
            >
              Score: {userPath.score.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Visualizer Component
export default function Visualizer() {
  const [modelData, setModelData] = useState<Model | null>(null);
  const [wordsByChar, setWordsByChar] = useState<WordsByChar>({});
  const [secretText, setSecretText] = useState('hello');
  const [currentMode, setCurrentMode] = useState('algorithm');
  const [isStarted, setIsStarted] = useState(false);
  const [targetChars, setTargetChars] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [algorithmBeam, setAlgorithmBeam] = useState<BeamPath[]>([]);
  const [algorithmHistory, setAlgorithmHistory] = useState<BeamPath[][]>([]);
  const [userPath, setUserPath] = useState<UserPath>({ sequence: [], score: 0.0 });
  const [userHistory, setUserHistory] = useState<UserPath[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // Load model on mount
  useEffect(() => {
    async function loadModel() {
      try {
        const response = await fetch('model_data.json');
        const data = await response.json();

        const loadedModel: Model = {
          vocab: data.vocab,
          map: data.map,
        };

        const wordsByCharMap: WordsByChar = {};
        loadedModel.vocab.forEach((word, idx) => {
          const firstChar = word[0];
          if (!wordsByCharMap[firstChar]) {
            wordsByCharMap[firstChar] = [];
          }
          wordsByCharMap[firstChar].push(idx);
        });

        setModelData(loadedModel);
        setWordsByChar(wordsByCharMap);
        console.log('Model loaded:', {
          vocabSize: loadedModel.vocab.length,
          wordsByCharKeys: Object.keys(wordsByCharMap).length,
        });
      } catch (error) {
        console.error('Error loading model:', error);
        alert('Failed to load model data');
      }
    }

    loadModel();
  }, []);

  // Cleanup play interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  const handleStart = () => {
    if (!modelData) return;

    const validation = validateMessage(secretText);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    const chars = validation.targetChars!;
    setTargetChars(chars);

    const beamInit = initializeBeam(chars, wordsByChar, currentMode);
    setAlgorithmBeam(beamInit.beam);
    setCurrentStep(beamInit.step);
    setAlgorithmHistory([JSON.parse(JSON.stringify(beamInit.beam))]);

    const userPathInit = initializeUserPath(beamInit.beam, currentMode);
    setUserPath(userPathInit);
    setUserHistory([JSON.parse(JSON.stringify(userPathInit))]);

    setIsStarted(true);
  };

  const handleReset = () => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(0);
    setAlgorithmHistory([]);
    setAlgorithmBeam([]);
    setUserPath({ sequence: [], score: 0.0 });
    setUserHistory([]);
    setIsStarted(false);
  };

  const algorithmStep = () => {
    if (!modelData || currentStep >= targetChars.length) return;

    const newBeam = performBeamStep(
      algorithmBeam,
      targetChars,
      currentStep,
      modelData,
      wordsByChar
    );
    setAlgorithmBeam(newBeam);
    setAlgorithmHistory((prev) => [...prev, JSON.parse(JSON.stringify(newBeam))]);
  };

  const handleNext = () => {
    if (currentStep < targetChars.length) {
      if (currentMode === 'algorithm') {
        algorithmStep();
        setCurrentStep((prev) => prev + 1);
      }
    }

    if (currentStep + 1 >= targetChars.length) {
      handlePause();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      setAlgorithmBeam(JSON.parse(JSON.stringify(algorithmHistory[newStep])));

      if (currentMode === 'manual') {
        setUserPath(JSON.parse(JSON.stringify(userHistory[newStep])));
      }
    }
  };

  const handlePlay = () => {
    if (isPlaying || currentMode === 'manual') return;

    setIsPlaying(true);
    playIntervalRef.current = window.setInterval(() => {
      setCurrentStep((step) => {
        if (step >= targetChars.length) {
          handlePause();
          return step;
        }
        return step;
      });
      handleNext();
    }, 1500);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  };

  const handleWordSelect = (wordId: number, score: number) => {
    if (currentMode !== 'manual' || !modelData) return;

    const result = handleWordSelectionLogic(userPath, wordId, score, currentStep);

    if (result.shouldAdvanceAlgorithm && currentStep > 0 && currentStep < targetChars.length) {
      algorithmStep();
    }

    setUserPath(result.newPath);
    setCurrentStep(result.newStep);
    setUserHistory((prev) => [...prev, JSON.parse(JSON.stringify(result.newPath))]);

    if (result.newStep >= targetChars.length) {
      handlePause();
    }
  };

  const handleModeChange = (mode: string) => {
    setCurrentMode(mode);
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="container-card bg-white rounded-xl p-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Interactive Encoding Visualizer</h1>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-4">
            <InputSection
              secretText={secretText}
              onSecretChange={setSecretText}
              onStart={handleStart}
              onReset={handleReset}
              currentMode={currentMode}
              onModeChange={handleModeChange}
            />

            <CharacterProgress
              targetChars={targetChars}
              currentStep={currentStep}
              show={isStarted}
            />

            <StepControls
              show={isStarted}
              currentStep={currentStep}
              targetLength={targetChars.length}
              currentMode={currentMode}
              userHistoryLength={userHistory.length}
              isPlaying={isPlaying}
              onPrev={handlePrev}
              onNext={handleNext}
              onPlay={handlePlay}
              onPause={handlePause}
            />

            {currentMode === 'manual' && (
              <ComparisonPanel
                show={isStarted}
                algorithmBeam={algorithmBeam}
                userPath={userPath}
                modelData={modelData}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-8">
            <BeamVisualization
              show={isStarted}
              currentMode={currentMode}
              algorithmBeam={algorithmBeam}
              userPath={userPath}
              targetChars={targetChars}
              currentStep={currentStep}
              modelData={modelData}
              wordsByChar={wordsByChar}
              onWordSelect={handleWordSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
