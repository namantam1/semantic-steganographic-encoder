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

export function StepControls({
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
