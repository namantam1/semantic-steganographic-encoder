interface ModeToggleProps {
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export function ModeToggle({ currentMode, onModeChange }: ModeToggleProps) {
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
