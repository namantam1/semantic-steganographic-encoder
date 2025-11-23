import { BeamPath, UserPath, Model } from '../visualizer-logic';
import { sequenceToSentence } from '../visualizer-logic';

interface ComparisonPanelProps {
  show: boolean;
  algorithmBeam: BeamPath[];
  userPath: UserPath;
  modelData: Model | null;
}

export function ComparisonPanel({ show, algorithmBeam, userPath, modelData }: ComparisonPanelProps) {
  if (!show || !modelData || algorithmBeam.length === 0) return null;

  const algorithmBest = algorithmBeam[0];

  return (
    <div className="comparison-panel p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">📊 Comparison</h2>
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Algorithm:</h3>
          <div className="sentence-display bg-white text-sm p-2">
            {sequenceToSentence(algorithmBest.sequence, modelData.vocab) || '(empty)'}
          </div>
          <div className="mt-1">
            <span className="score-badge text-xs">Score: {algorithmBest.score.toFixed(2)}</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Your Path:</h3>
          <div className="sentence-display bg-white text-sm p-2">
            {sequenceToSentence(userPath.sequence, modelData.vocab) || '(empty)'}
          </div>
          <div className="mt-1">
            <span
              className="score-badge text-xs"
              style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
            >
              Score: {userPath.score.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
