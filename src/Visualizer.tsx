import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './style.css';
import './visualizer.css';
import { Model, WordsByChar } from './encoder';
import {
  initializeBeam,
  initializeUserPath,
  performBeamStep,
  getStepCandidates,
  handleWordSelection as handleWordSelectionLogic,
  validateMessage,
  BeamPath,
  UserPath,
  SENTENCE_BREAK_ID,
} from './visualizer-logic';
import { InputSection } from './components/InputSection';
import { CharacterProgress } from './components/CharacterProgress';
import { StepControls } from './components/StepControls';
import { GraphVisualization } from './components/GraphVisualization';
import { BeamVisualization } from './components/BeamVisualization';
import { ComparisonPanel } from './components/ComparisonPanel';

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
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Interactive Encoding Visualizer</h1>
            <Link
              to="/"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-150"
            >
              Encoder
            </Link>
          </div>
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
          <div className="lg:col-span-8 space-y-4">
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

            <GraphVisualization
              show={isStarted}
              currentWord={
                currentMode === 'manual'
                  ? userPath.sequence.length > 0
                    ? modelData?.vocab[userPath.sequence[userPath.sequence.length - 1]] || 'start'
                    : 'start'
                  : algorithmBeam.length > 0 && algorithmBeam[0].sequence.length > 0
                  ? modelData?.vocab[algorithmBeam[0].sequence[algorithmBeam[0].sequence.length - 1]] || 'start'
                  : 'start'
              }
              currentWordId={
                currentMode === 'manual'
                  ? userPath.sequence.length > 0
                    ? userPath.sequence[userPath.sequence.length - 1]
                    : SENTENCE_BREAK_ID
                  : algorithmBeam.length > 0 && algorithmBeam[0].sequence.length > 0
                  ? algorithmBeam[0].sequence[algorithmBeam[0].sequence.length - 1]
                  : SENTENCE_BREAK_ID
              }
              candidates={
                currentStep < targetChars.length
                  ? getStepCandidates(
                      currentMode === 'manual' ? userPath : algorithmBeam[0] || { sequence: [], score: 0 },
                      targetChars,
                      currentStep,
                      modelData!,
                      wordsByChar,
                      currentMode
                    )
                  : []
              }
              modelData={modelData}
              targetChar={currentStep < targetChars.length ? targetChars[currentStep] : ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
