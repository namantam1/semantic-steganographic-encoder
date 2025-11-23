interface CharacterProgressProps {
  targetChars: string[];
  currentStep: number;
  show: boolean;
}

export function CharacterProgress({ targetChars, currentStep, show }: CharacterProgressProps) {
  if (!show) return null;

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Progress</h2>
      <div className="flex flex-wrap items-center">
        {targetChars.map((char, idx) => {
          let className = 'char-box';
          if (idx < currentStep) className += ' completed';
          else if (idx === currentStep) className += ' current';
          else className += ' pending';

          return (
            <div key={idx} className={className}>
              {char}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-gray-600">
        <div>
          Encoding character {currentStep + 1} of {targetChars.length}:{' '}
          "{targetChars[currentStep] || 'Complete'}"
        </div>
      </div>
    </div>
  );
}
