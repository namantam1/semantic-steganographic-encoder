interface EncoderFormProps {
  secretText: string;
  onSecretChange: (text: string) => void;
  onEncode: () => void;
  isEncoding: boolean;
  isModelReady: boolean;
  errorMessage: string;
  realTimeEnabled: boolean;
}

export function EncoderForm({
  secretText,
  onSecretChange,
  onEncode,
  isEncoding,
  isModelReady,
  errorMessage,
  realTimeEnabled,
}: EncoderFormProps) {
  return (
    <section className="space-y-4">
      <label htmlFor="secretInput" className="block text-lg font-medium text-gray-700">
        Secret Message {realTimeEnabled && <span className="text-sm text-blue-600">(Real-time encoding enabled)</span>}
      </label>
      <input
        type="text"
        id="secretInput"
        value={secretText}
        onChange={(e) => onSecretChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-800"
        placeholder="Enter text to encode (e.g., hello)"
      />

      {!realTimeEnabled && (
        <button
          onClick={onEncode}
          disabled={!isModelReady || isEncoding}
          className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <span>{isEncoding ? 'Encoding...' : 'Encode Message'}</span>
          {isEncoding && <div className="loading-ring ml-3"></div>}
        </button>
      )}

      {errorMessage && (
        <div className="text-sm text-red-600 mt-2">{errorMessage}</div>
      )}
    </section>
  );
}
