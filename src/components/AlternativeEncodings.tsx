import { CopyButton } from './CopyButton';

interface AlternativeEncodingsProps {
  alternatives: Array<{ text: string; score: number }>;
}

export function AlternativeEncodings({ alternatives }: AlternativeEncodingsProps) {
  if (alternatives.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-3">
      {alternatives.slice(1).map((alt, index) => (
        <div
          key={index}
          className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-700">
              #{index + 2} · Score: {alt.score.toFixed(2)}
            </span>
            <CopyButton text={alt.text} />
          </div>
          <div className="text-gray-800 whitespace-pre-wrap break-words select-all text-sm">
            {alt.text}
          </div>
        </div>
      ))}
      <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded border border-purple-200">
        <strong>💡 Tip:</strong> Higher scores indicate more grammatically coherent sentences.
      </div>
    </div>
  );
}
