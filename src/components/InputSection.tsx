import { ModeToggle } from './ModeToggle';
import { ModelType } from '../../lib/types';

interface InputSectionProps {
  secretText: string;
  onSecretChange: (text: string) => void;
  onStart: () => void;
  onReset: () => void;
  currentMode: string;
  onModeChange: (mode: string) => void;
  modelType: ModelType;
  onModelTypeChange: (type: ModelType) => void;
}

export function InputSection({
  secretText,
  onSecretChange,
  onStart,
  onReset,
  currentMode,
  onModeChange,
  modelType,
  onModelTypeChange,
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

      {/* Model Type Selector */}
      <div className="mb-3">
        <label htmlFor="modelType" className="block text-xs font-medium text-gray-700 mb-1">
          Model Type
        </label>
        <select
          id="modelType"
          value={modelType}
          onChange={(e) => onModelTypeChange(e.target.value as ModelType)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value={ModelType.BIGRAM}>Bigram (2-word context)</option>
          <option value={ModelType.TRIGRAM}>Trigram (3-word context)</option>
        </select>
      </div>

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
