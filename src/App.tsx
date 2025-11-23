import { useState, useEffect } from 'react';
import './style.css';
import {
  getTargetChars,
  encodeText,
  decodeText,
  decodeAndSplit,
  Model,
  WordsByChar,
} from './encoder';

// EncoderForm Component
interface EncoderFormProps {
  secretText: string;
  onSecretChange: (text: string) => void;
  onEncode: () => void;
  isEncoding: boolean;
  isModelReady: boolean;
  errorMessage: string;
}

function EncoderForm({
  secretText,
  onSecretChange,
  onEncode,
  isEncoding,
  isModelReady,
  errorMessage,
}: EncoderFormProps) {
  return (
    <section className="space-y-4">
      <label htmlFor="secretInput" className="block text-lg font-medium text-gray-700">
        Secret Message (Characters will be encoded)
      </label>
      <input
        type="text"
        id="secretInput"
        value={secretText}
        onChange={(e) => onSecretChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800"
        placeholder="Enter text to encode (e.g., hello)"
      />

      <button
        onClick={onEncode}
        disabled={!isModelReady || isEncoding}
        className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        <span>{isEncoding ? 'Encoding...' : 'Encode Message'}</span>
        {isEncoding && <div className="loading-ring ml-3"></div>}
      </button>

      {errorMessage && (
        <div className="text-sm text-red-600 mt-2">{errorMessage}</div>
      )}
    </section>
  );
}

// CoverTextDisplay Component
interface CoverTextDisplayProps {
  coverText: string;
}

function CoverTextDisplay({ coverText }: CoverTextDisplayProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800">1. Encoded Cover Text</h2>
      <div className="min-h-12 p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap select-all mt-4">
        {coverText || 'The resulting sentence will appear here.'}
      </div>
    </div>
  );
}

// DecodedVerification Component
interface DecodedVerificationProps {
  original: string;
  decoded: string;
}

function DecodedVerification({ original, decoded }: DecodedVerificationProps) {
  const isMatch = original === decoded;
  const textColor = isMatch ? 'text-green-700' : 'text-red-700';

  return (
    <div className="pt-4">
      <h2 className="text-xl font-semibold text-gray-800">2. Decoded Verification</h2>
      <div className={`min-h-12 p-4 bg-gray-50 border border-gray-200 rounded-lg ${textColor} font-mono mt-4`}>
        {original || decoded
          ? `Original: ${original} | Decoded: ${decoded}`
          : 'Decoded message verification (first letter of each word).'}
      </div>
    </div>
  );
}

// DecodedWordSplit Component
interface DecodedWordSplitProps {
  decodedSplit: string;
}

function DecodedWordSplit({ decodedSplit }: DecodedWordSplitProps) {
  return (
    <div className="pt-4">
      <h2 className="text-xl font-semibold text-gray-800">3. Decoded Message (Word Split)</h2>
      <div className="min-h-12 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium mt-4">
        {decodedSplit || 'Decoded message automatically split into words using vocabulary.'}
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  const [model, setModel] = useState<Model | null>(null);
  const [wordsByChar, setWordsByChar] = useState<WordsByChar>({});
  const [secretText, setSecretText] = useState('I am good');
  const [coverText, setCoverText] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [decodedSplit, setDecodedSplit] = useState('');
  const [originalChars, setOriginalChars] = useState('');
  const [isEncoding, setIsEncoding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);

  // Load model on mount
  useEffect(() => {
    async function loadModel() {
      try {
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
      }
    }

    loadModel().then((result) => {
      // Run initial encoding if model loaded successfully
      if (result) {
        handleEncode('I am good', result.model, result.wordsByChar);
      }
    });
  }, []);

  const handleEncode = (
    secret?: string,
    modelOverride?: Model,
    wordsByCharOverride?: WordsByChar
  ) => {
    const currentModel = modelOverride || model;
    const currentWordsByChar = wordsByCharOverride || wordsByChar;
    const secretToEncode = secret !== undefined ? secret : secretText;

    if (!currentModel) {
      setErrorMessage('Model not ready. Please refresh.');
      return;
    }

    if (secretToEncode.trim().length === 0) {
      setErrorMessage('Please enter a secret message.');
      return;
    }

    setErrorMessage('');
    setIsEncoding(true);

    const targetChars = getTargetChars(secretToEncode);

    // Use setTimeout to allow UI to update loading state
    setTimeout(() => {
      const encoded = encodeText(currentModel, currentWordsByChar, targetChars);
      const decoded = decodeText(encoded);
      const split = decodeAndSplit(currentModel, encoded);

      setCoverText(encoded);
      setDecodedText(decoded);
      setDecodedSplit(split);
      setOriginalChars(targetChars.join(''));

      if (targetChars.join('') !== decoded) {
        console.error('Decoding error! Check if the corpus has enough transition data.');
      }

      setIsEncoding(false);
    }, 10);
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen flex items-start justify-center">
      <div className="w-full max-w-3xl container-card bg-white rounded-xl p-6 sm:p-8 space-y-8 mt-10">
        <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-4">
          Lexical Steganography Encoder
        </h1>

        <EncoderForm
          secretText={secretText}
          onSecretChange={setSecretText}
          onEncode={() => handleEncode()}
          isEncoding={isEncoding}
          isModelReady={isModelReady}
          errorMessage={errorMessage}
        />

        <section className="space-y-4 pt-4 border-t">
          <CoverTextDisplay coverText={coverText} />
          <DecodedVerification original={originalChars} decoded={decodedText} />
          <DecodedWordSplit decodedSplit={decodedSplit} />
        </section>
      </div>
    </div>
  );
}
