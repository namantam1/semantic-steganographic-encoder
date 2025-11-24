import { useState } from 'react';
import { decodeText, decodeAndSplit } from '../../lib/decoder/decoder';
import type { Model } from '../../lib/types';
import { CopyButton } from './CopyButton';
import { LoadingSpinner } from './LoadingSpinner';

interface DecoderProps {
  model: Model | null;
}

export function Decoder({ model }: DecoderProps) {
  const [encodedText, setEncodedText] = useState('');
  const [decodedRaw, setDecodedRaw] = useState('');
  const [decodedSplit, setDecodedSplit] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);

  const handleDecode = () => {
    if (!encodedText.trim()) {
      return;
    }

    setIsDecoding(true);

    // Use setTimeout to show loading indicator
    setTimeout(() => {
      const raw = decodeText(encodedText);
      setDecodedRaw(raw);

      if (model) {
        const split = decodeAndSplit(model, encodedText);
        setDecodedSplit(split);
      }

      setIsDecoding(false);
    }, 10);
  };

  return (
    <div className="space-y-6">
      {/* Beta Notice */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🧪</span>
          <div>
            <h3 className="font-semibold text-purple-900 mb-1">Beta Feature</h3>
            <p className="text-sm text-purple-700">
              This decoder extracts the hidden message from steganographically encoded text by taking the first letter of each word.
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="container-card bg-white rounded-xl p-6 shadow-sm">
        <label htmlFor="encodedInput" className="block text-lg font-medium text-gray-700 mb-4">
          Encoded Cover Text
        </label>
        <textarea
          id="encodedInput"
          value={encodedText}
          onChange={(e) => setEncodedText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-gray-800 min-h-32"
          placeholder="Paste the encoded text here (e.g., 'In afternoon, may good on offer day.')"
        />
        <button
          onClick={handleDecode}
          className="mt-4 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-150"
        >
          Decode Message
        </button>
      </div>

      {/* Results */}
      {decodedRaw && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Raw Decoded */}
          <div className="container-card bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Raw Decoded Characters</h2>
              <CopyButton text={decodedRaw} />
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-mono text-sm break-words">
              {decodedRaw}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              First letter of each word
            </div>
          </div>

          {/* Word Split */}
          <div className="container-card bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Decoded Message (Word Split)</h2>
              <CopyButton text={decodedSplit} />
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium text-sm break-words">
              {decodedSplit || 'Processing...'}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Automatically split using DP algorithm
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
