import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './style.css';
import {
  getTargetChars,
  encodeTextMultiple,
  Model,
  WordsByChar,
  BEAM_WIDTH,
} from './encoder';
import { EncoderForm } from './components/EncoderForm';
import { CoverTextDisplay } from './components/CoverTextDisplay';
import { AlternativeEncodings } from './components/AlternativeEncodings';
import { ControlPanel } from './components/ControlPanel';
import { Tabs } from './components/Tabs';
import { Decoder } from './components/Decoder';
import { GlobalLoader } from './components/GlobalLoader';

// Main App Component
export default function App() {
  const [model, setModel] = useState<Model | null>(null);
  const [wordsByChar, setWordsByChar] = useState<WordsByChar>({});
  const [secretText, setSecretText] = useState('I am good');
  const [coverText, setCoverText] = useState('');
  const [alternatives, setAlternatives] = useState<Array<{ text: string; score: number }>>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading model data...');

  // Control states
  const [beamWidth, setBeamWidth] = useState(BEAM_WIDTH);
  const [alternativesCount, setAlternativesCount] = useState(3);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'encoder' | 'decoder'>('encoder');

  const debounceTimerRef = useRef<number | null>(null);

  // Load model on mount
  useEffect(() => {
    async function loadModel() {
      try {
        setIsLoading(true);
        setLoadingMessage('Loading model data...');
        const response = await fetch('model_data.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Data Processing for Efficiency
        const loadedModel: Model = {
          vocab: data.vocab,
          map: data.map,
        };

        // Create the fallback structure: { 'a': [id1, id2, ...], 'b': [...] }
        const wordsByCharMap: WordsByChar = {};
        loadedModel.vocab.forEach((word, id) => {
          const char = word[0];
          if (!wordsByCharMap[char]) {
            wordsByCharMap[char] = [];
          }
          wordsByCharMap[char].push(id);
        });

        setModel(loadedModel);
        setWordsByChar(wordsByCharMap);
        setIsModelReady(true);
        console.log(`Model loaded successfully. Vocab size: ${loadedModel.vocab.length}`);

        return { model: loadedModel, wordsByChar: wordsByCharMap };
      } catch (error) {
        console.error('Error loading model:', error);
        setErrorMessage('Error: Could not load model_data.json. Check console.');
        return null;
      } finally {
        setIsLoading(false);
      }
    }

    loadModel().then((result) => {
      // Run initial encoding if model loaded successfully
      if (result) {
        handleEncode('I am good', result.model, result.wordsByChar, BEAM_WIDTH, 3);
      }
    });
  }, []);

  // Real-time encoding effect
  useEffect(() => {
    if (realTimeEnabled && isModelReady && secretText.trim().length > 0) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer for debounced encoding
      debounceTimerRef.current = window.setTimeout(() => {
        handleEncode(secretText, model, wordsByChar, beamWidth, alternativesCount);
      }, 500); // 500ms debounce

      // Cleanup
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
  }, [secretText, realTimeEnabled, isModelReady, beamWidth, alternativesCount]);

  const handleEncode = (
    secret?: string,
    modelOverride?: Model | null,
    wordsByCharOverride?: WordsByChar,
    customBeamWidth?: number,
    customAlternativesCount?: number
  ) => {
    const currentModel = modelOverride || model;
    const currentWordsByChar = wordsByCharOverride || wordsByChar;
    const secretToEncode = secret !== undefined ? secret : secretText;
    const currentBeamWidth = customBeamWidth !== undefined ? customBeamWidth : beamWidth;
    const currentAlternativesCount = customAlternativesCount !== undefined ? customAlternativesCount : alternativesCount;

    if (!currentModel) {
      setErrorMessage('Model not ready. Please refresh.');
      return;
    }

    if (secretToEncode.trim().length === 0) {
      setErrorMessage('Please enter a secret message.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    setLoadingMessage('Encoding your message...');

    const targetChars = getTargetChars(secretToEncode);

    // Use setTimeout to allow UI to update loading state
    setTimeout(() => {
      const encodedResults = encodeTextMultiple(
        currentModel,
        currentWordsByChar,
        targetChars,
        currentBeamWidth,
        currentAlternativesCount
      );

      const bestResult = encodedResults[0];
      setCoverText(bestResult.text);
      setAlternatives(encodedResults);

      setIsLoading(false);
    }, 10);
  };

  const handleBeamWidthChange = (value: number) => {
    setBeamWidth(value);
    if (realTimeEnabled) {
      // Real-time will trigger automatically via useEffect
      return;
    }
  };

  const handleAlternativesCountChange = (value: number) => {
    setAlternativesCount(value);
    if (realTimeEnabled) {
      // Real-time will trigger automatically via useEffect
      return;
    }
  };

  return (
    <>
      {/* Global Non-Blocking Loader */}
      {isLoading && <GlobalLoader message={loadingMessage} />}

      <div className="p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="container-card bg-white rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Lexical Steganography
            </h1>
            <Link
              to="/visualizer"
              className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition duration-150 shadow-sm"
            >
              Visualizer
            </Link>
          </div>

          {/* Tabs */}
          <div className="mt-4">
            <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'encoder' ? (
          /* Encoder View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Input & Controls */}
            <div className="lg:col-span-4 space-y-6">
              {/* Input Section */}
              <div className="container-card bg-white rounded-xl p-6 shadow-sm">
                <EncoderForm
                  secretText={secretText}
                  onSecretChange={setSecretText}
                  onEncode={() => handleEncode()}
                  isEncoding={isLoading}
                  isModelReady={isModelReady}
                  errorMessage={errorMessage}
                  realTimeEnabled={realTimeEnabled}
                />
              </div>

              {/* Controls Section */}
              <div className="container-card bg-white rounded-xl p-6 shadow-sm">
                <ControlPanel
                  beamWidth={beamWidth}
                  onBeamWidthChange={handleBeamWidthChange}
                  alternativesCount={alternativesCount}
                  onAlternativesCountChange={handleAlternativesCountChange}
                  realTimeEnabled={realTimeEnabled}
                  onRealTimeToggle={setRealTimeEnabled}
                />
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-8 space-y-6">
              {/* Main Result Card */}
              <div className="container-card bg-white rounded-xl p-6 shadow-sm">
                <CoverTextDisplay coverText={coverText} />
              </div>

              {/* Alternative Encodings Section */}
              {alternatives.length > 1 && (
                <div className="container-card bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Alternative Encodings ({alternatives.length - 1} more options)
                  </h2>
                  <AlternativeEncodings alternatives={alternatives} />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Decoder View */
          <Decoder model={model} />
        )}
        </div>
      </div>
    </>
  );
}
