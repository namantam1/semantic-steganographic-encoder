import type { Model, BigramModel, TrigramModel } from '../../lib/types';
import { ModelType } from '../../lib/types';

interface ModelStatisticsProps {
  model: Model;
  wordId: number;
  word: string;
}

export function ModelStatistics({ model, wordId, word }: ModelStatisticsProps) {
  // Calculate statistics based on model type
  const getStatistics = () => {
    if (model.type === ModelType.BIGRAM) {
      const bigramModel = model as BigramModel;
      const wordIdStr = String(wordId);
      const transitions = bigramModel.map[wordIdStr] || {};

      // Count total transitions
      let totalTransitions = 0;
      const charStats: Array<{ char: string; count: number }> = [];

      Object.entries(transitions).forEach(([char, wordIds]) => {
        const count = wordIds.length;
        totalTransitions += count;
        charStats.push({ char, count });
      });

      // Sort by count descending
      charStats.sort((a, b) => b.count - a.count);

      return {
        totalTransitions,
        uniqueChars: Object.keys(transitions).length,
        charStats: charStats.slice(0, 10), // Top 10
        avgTransitionsPerChar: totalTransitions / Math.max(1, Object.keys(transitions).length),
      };
    } else {
      const trigramModel = model as TrigramModel;
      const wordIdStr = String(wordId);
      const contexts = trigramModel.map[wordIdStr] || {};

      // Count total transitions across all contexts
      let totalTransitions = 0;
      let totalChars = 0;
      const charCounts: { [char: string]: number } = {};

      Object.values(contexts).forEach((transitions) => {
        Object.entries(transitions).forEach(([char, wordIds]) => {
          const count = wordIds.length;
          totalTransitions += count;
          totalChars++;
          charCounts[char] = (charCounts[char] || 0) + count;
        });
      });

      const charStats = Object.entries(charCounts)
        .map(([char, count]) => ({ char, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalTransitions,
        uniqueChars: Object.keys(charCounts).length,
        uniqueContexts: Object.keys(contexts).length,
        charStats,
        avgTransitionsPerChar: totalTransitions / Math.max(1, totalChars),
      };
    }
  };

  const stats = getStatistics();

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Statistics</h2>

      <div className="space-y-3">
        {/* Word Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Current Word</div>
          <div className="font-semibold text-gray-800">{word}</div>
          <div className="text-xs text-gray-500">ID: {wordId}</div>
        </div>

        {/* Model Info */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">Model Type</div>
          <div className="font-semibold text-gray-800">{model.type.toUpperCase()}</div>
          <div className="text-xs text-gray-500">
            Vocabulary Size: {model.vocab.length.toLocaleString()}
          </div>
        </div>

        {/* Transition Stats */}
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-xs text-gray-600 mb-2">Transitions</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-600">Total</div>
              <div className="font-semibold text-gray-800">{stats.totalTransitions}</div>
            </div>
            <div>
              <div className="text-gray-600">Unique Chars</div>
              <div className="font-semibold text-gray-800">{stats.uniqueChars}</div>
            </div>
            {'uniqueContexts' in stats && (
              <div className="col-span-2">
                <div className="text-gray-600">Unique Contexts</div>
                <div className="font-semibold text-gray-800">{stats.uniqueContexts}</div>
              </div>
            )}
            <div className="col-span-2">
              <div className="text-gray-600">Avg per Char</div>
              <div className="font-semibold text-gray-800">
                {stats.avgTransitionsPerChar.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Top Characters */}
        {stats.charStats.length > 0 && (
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="text-xs text-gray-600 mb-2">Top Characters</div>
            <div className="space-y-1">
              {stats.charStats.map(({ char, count }) => (
                <div key={char} className="flex items-center justify-between text-sm">
                  <span className="font-mono font-semibold text-gray-800">"{char}"</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.charStats[0].count) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-gray-600 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
