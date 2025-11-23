import { Model, WordsByChar, BeamPath, UserPath, SENTENCE_BREAK_ID } from '../visualizer-logic';
import { getStepCandidates, sequenceToSentence } from '../visualizer-logic';

const DISPLAY_BEAMS = 3;

interface BeamVisualizationProps {
  show: boolean;
  currentMode: string;
  algorithmBeam: BeamPath[];
  userPath: UserPath;
  targetChars: string[];
  currentStep: number;
  modelData: Model | null;
  wordsByChar: WordsByChar;
  onWordSelect?: (wordId: number, score: number) => void;
}

export function BeamVisualization({
  show,
  currentMode,
  algorithmBeam,
  userPath,
  targetChars,
  currentStep,
  modelData,
  wordsByChar,
  onWordSelect,
}: BeamVisualizationProps) {
  if (!show || !modelData) return null;

  const renderWordCandidates = (
    candidates: Array<[number, number]>,
    clickable: boolean
  ) => {
    const displayCandidates = candidates.slice(0, 8);

    return (
      <div className="flex flex-wrap gap-1">
        {displayCandidates.map(([wordId, score], idx) => {
          const isBreak = wordId === SENTENCE_BREAK_ID;
          const word = isBreak ? null : modelData.vocab[wordId];

          return (
            <div
              key={idx}
              className="word-candidate"
              style={{
                cursor: clickable ? 'pointer' : 'default',
                fontStyle: isBreak ? 'italic' : 'normal',
                fontSize: isBreak ? '0.75rem' : '0.875rem',
              }}
              onClick={() => clickable && onWordSelect?.(wordId, score)}
            >
              {isBreak ? (
                '⏎ Break'
              ) : (
                <>
                  <span>{word}</span>
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginLeft: '0.375rem' }}>
                    {score.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (currentMode === 'manual') {
    const candidates = getStepCandidates(
      userPath,
      targetChars,
      currentStep,
      modelData,
      wordsByChar,
      currentMode
    );

    return (
      <div className="container-card bg-white rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Top Beam Paths <span className="text-xs font-normal text-gray-600">(best 3)</span>
          </h2>
        </div>
        <div className="space-y-3">
          <div className="beam-card user-path">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-semibold text-gray-800">Your Path</span>
              </div>
              <span
                className="score-badge text-xs"
                style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
              >
                Score: {userPath.score.toFixed(2)}
              </span>
            </div>

            <div className="sentence-display mb-2">
              {sequenceToSentence(userPath.sequence, modelData.vocab) || '(start encoding)'}
            </div>

            {currentStep < targetChars.length && (
              <>
                <div className="text-xs font-semibold text-gray-700 mb-2">
                  Choose next word for "{targetChars[currentStep]}":
                </div>
                {renderWordCandidates(candidates, true)}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Algorithm mode - show top 3 beams
  const beamsToDisplay = algorithmBeam.slice(0, DISPLAY_BEAMS);

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">
          Top Beam Paths <span className="text-xs font-normal text-gray-600">(best 3)</span>
        </h2>
      </div>
      <div className="space-y-3">
        {beamsToDisplay.map((path, beamIdx) => {
          const candidates = getStepCandidates(
            path,
            targetChars,
            currentStep,
            modelData,
            wordsByChar,
            currentMode
          );

          return (
            <div key={beamIdx} className={`beam-card ${beamIdx === 0 ? 'best' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-gray-800">Beam #{beamIdx + 1}</span>
                  {beamIdx === 0 && (
                    <span className="ml-2 text-xs text-blue-600 font-semibold">★ Best</span>
                  )}
                </div>
                <span className="score-badge text-xs">Score: {path.score.toFixed(2)}</span>
              </div>

              <div className="sentence-display mb-2">
                {sequenceToSentence(path.sequence, modelData.vocab) || '(empty)'}
              </div>

              {currentStep < targetChars.length && (
                <>
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Next candidates for "{targetChars[currentStep]}":
                  </div>
                  {renderWordCandidates(candidates, false)}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
