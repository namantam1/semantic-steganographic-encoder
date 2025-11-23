import { ModeToggle } from './ModeToggle';

interface InputSectionProps {
  secretText: string;
  onSecretChange: (text: string) => void;
  onStart: () => void;
  onReset: () => void;
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export function InputSection({
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
