import { BEAM_WIDTH } from '../encoder';

interface ControlPanelProps {
  beamWidth: number;
  onBeamWidthChange: (value: number) => void;
  alternativesCount: number;
  onAlternativesCountChange: (value: number) => void;
  realTimeEnabled: boolean;
  onRealTimeToggle: (enabled: boolean) => void;
}

export function ControlPanel({
  beamWidth,
  onBeamWidthChange,
  alternativesCount,
  onAlternativesCountChange,
  realTimeEnabled,
  onRealTimeToggle,
}: ControlPanelProps) {
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Encoding Controls</h2>

      {/* Real-time Toggle */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <label htmlFor="realTimeToggle" className="text-sm font-medium text-gray-700">
          Real-time Encoding
        </label>
        <button
          id="realTimeToggle"
          onClick={() => onRealTimeToggle(!realTimeEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shadow-inner ${
            realTimeEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
              realTimeEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Beam Width Slider */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <label htmlFor="beamWidth" className="block text-sm font-medium text-gray-700 mb-3">
          Beam Width: <span className="font-bold text-blue-600">{beamWidth}</span>
          <span className="text-xs text-gray-500 ml-2">(Default: {BEAM_WIDTH})</span>
        </label>
        <input
          type="range"
          id="beamWidth"
          min="5"
          max="50"
          step="5"
          value={beamWidth}
          onChange={(e) => onBeamWidthChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5</span>
          <span>50</span>
        </div>
      </div>

      {/* Alternatives Count Slider */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <label htmlFor="alternativesCount" className="block text-sm font-medium text-gray-700 mb-3">
          Alternative Options: <span className="font-bold text-purple-600">{alternativesCount}</span>
        </label>
        <input
          type="range"
          id="alternativesCount"
          min="1"
          max="10"
          step="1"
          value={alternativesCount}
          onChange={(e) => onAlternativesCountChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1</span>
          <span>10</span>
        </div>
      </div>

      <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <strong>💡 Tip:</strong> Higher beam width = better quality but slower encoding.
        {realTimeEnabled && ' Real-time mode may be slower with high values.'}
      </div>
    </section>
  );
}
