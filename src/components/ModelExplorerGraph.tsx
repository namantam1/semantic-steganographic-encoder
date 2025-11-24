import { useMemo } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  ConnectionLineType,
  Position,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Model, BigramModel, TrigramModel } from '../../lib/types';
import { ModelType } from '../../lib/types';

interface ModelExplorerGraphProps {
  model: Model;
  startWordId: number;
  startWord: string;
  depth: number;
}

// Custom node component for grouped words
function GroupedWordsNode({ data }: { data: { items: Array<[string, number]> } }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '2px solid #1f2937',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '180px',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#1f2937' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#1f2937' }}
      />
      {data.items.slice(0, 5).map(([word], idx) => (
        <div
          key={idx}
          style={{
            fontSize: '13px',
            color: '#1f2937',
            padding: '2px 0',
            textAlign: 'left',
          }}
        >
          {word}
        </div>
      ))}
      {data.items.length > 5 && (
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            padding: '2px 0',
            fontStyle: 'italic',
          }}
        >
          +{data.items.length - 5} more...
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  groupedWords: GroupedWordsNode,
};

export function ModelExplorerGraph({
  model,
  startWordId,
  startWord,
  depth,
}: ModelExplorerGraphProps) {
  // Build nodes and edges for React Flow
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const horizontalSpacing = 450;
    const verticalSpacing = 200;

    if (model.type === ModelType.BIGRAM) {
      // Bigram visualization
      const bigramModel = model as BigramModel;

      // First pass: count total nodes per level for centering
      const nodesPerLevel: number[] = new Array(depth + 1).fill(0);
      const tempQueue: Array<{ wordId: number; level: number }> = [{ wordId: startWordId, level: 0 }];
      const tempVisited = new Set<string>();
      tempVisited.add(`${startWordId}-0`);

      while (tempQueue.length > 0) {
        const { wordId, level } = tempQueue.shift()!;
        if (level >= depth) continue;

        const transitions = bigramModel.map[String(wordId)] || {};
        // Sort and limit to top 10 transitions
        const sortedTransitions = Object.entries(transitions)
          .sort(([, aWordIds], [, bWordIds]) => bWordIds.length - aWordIds.length)
          .slice(0, 10);

        sortedTransitions.forEach(([_char, wordIds]) => {
          if (wordIds.length > 0) {
            nodesPerLevel[level + 1]++;

            if (level + 1 < depth) {
              wordIds.slice(0, 3).forEach((nextWordId) => {
                const key = `${nextWordId}-${level + 1}`;
                if (!tempVisited.has(key)) {
                  tempVisited.add(key);
                  tempQueue.push({ wordId: nextWordId, level: level + 1 });
                }
              });
            }
          }
        });
      }

      // Calculate vertical offsets to center each level
      const levelOffsets: number[] = nodesPerLevel.map((count) => {
        return -(count - 1) * verticalSpacing / 2;
      });

      const levelCounts: number[] = new Array(depth + 1).fill(0);

      interface BigramQueueItem {
        wordId: number;
        word: string;
        level: number;
        parentId: string;
      }

      const queue: BigramQueueItem[] = [
        {
          wordId: startWordId,
          word: startWord,
          level: 0,
          parentId: '',
        },
      ];
      const visited = new Set<string>();

      // Root node - centered
      nodes.push({
        id: `word-${startWordId}-0`,
        type: 'default',
        data: { label: startWord },
        position: { x: 0, y: levelOffsets[0] },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          fontWeight: 'bold',
          border: '2px solid #1f2937',
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '14px',
        },
      });

      visited.add(`${startWordId}-0`);

      while (queue.length > 0) {
        const item = queue.shift()!;
        const { wordId, level, parentId } = item;

        if (level >= depth) continue;

        const transitions = bigramModel.map[String(wordId)] || {};

        // Sort transitions by word count (most frequent first) and take top 10
        const sortedTransitions = Object.entries(transitions)
          .sort(([, aWordIds], [, bWordIds]) => bWordIds.length - aWordIds.length)
          .slice(0, 10);

        sortedTransitions.forEach(([char, wordIds]) => {
          if (wordIds.length === 0) return;

          const nodeId = `char-${char}-${wordId}-${level}`;
          const yPos = levelOffsets[level + 1] + (levelCounts[level + 1] * verticalSpacing);
          levelCounts[level + 1]++;

          const words = wordIds.slice(0, 10).map(id => [model.vocab[id], id] as [string, number]);

          nodes.push({
            id: nodeId,
            type: 'groupedWords',
            data: { items: words },
            position: { x: (level + 1) * horizontalSpacing, y: yPos },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });

          const sourceId = level === 0 ? `word-${startWordId}-0` : parentId;
          edges.push({
            id: `edge-${sourceId}-${nodeId}`,
            source: sourceId,
            target: nodeId,
            label: char,
            type: ConnectionLineType.Straight,
            style: {
              stroke: '#1f2937',
              strokeWidth: 2,
            },
            labelStyle: {
              fontSize: '14px',
              fill: '#1f2937',
              fontWeight: 'bold',
            },
            labelBgStyle: {
              fill: '#ffffff',
              fillOpacity: 0.8,
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#1f2937',
              width: 20,
              height: 20,
            },
          });

          if (level + 1 < depth) {
            wordIds.slice(0, 3).forEach((nextWordId) => {
              const key = `${nextWordId}-${level + 1}`;
              if (!visited.has(key)) {
                visited.add(key);
                queue.push({
                  wordId: nextWordId,
                  word: model.vocab[nextWordId],
                  level: level + 1,
                  parentId: nodeId,
                });
              }
            });
          }
        });
      }
    } else {
      // Trigram visualization - show word pairs as nodes
      const trigramModel = model as TrigramModel;
      const levelCounts: number[] = new Array(depth + 1).fill(0);

      interface TrigramQueueItem {
        word1Id: number;
        word2Id: number;
        word1: string;
        word2: string;
        level: number;
        parentId: string;
      }

      // For trigram, we need to find a second word to start with
      // Get the first transition from the start word
      const firstWordTransitions = trigramModel.map[String(startWordId)] || {};

      // Get all possible second words
      const secondWordCandidates: Array<{ word2Id: number; word2: string }> = [];
      Object.values(firstWordTransitions).forEach((transitions) => {
        Object.values(transitions).forEach((wordIds) => {
          wordIds.slice(0, 3).forEach((word2Id) => {
            if (!secondWordCandidates.find(c => c.word2Id === word2Id)) {
              secondWordCandidates.push({ word2Id, word2: model.vocab[word2Id] });
            }
          });
        });
      });

      if (secondWordCandidates.length === 0) {
        // No transitions found, show just the start word
        nodes.push({
          id: `word-${startWordId}-0`,
          type: 'default',
          data: { label: startWord },
          position: { x: 0, y: 0 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            fontWeight: 'bold',
            border: '2px solid #1f2937',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '14px',
          },
        });
        return { nodes, edges };
      }

      const queue: TrigramQueueItem[] = [];
      const visited = new Set<string>();

      // Create root nodes for each word pair starting with startWord
      secondWordCandidates.slice(0, 5).forEach((candidate, idx) => {
        const { word2Id, word2 } = candidate;
        const nodeId = `pair-${startWordId}-${word2Id}-0`;
        const pairLabel = `${startWord}\n${word2}`;

        nodes.push({
          id: nodeId,
          type: 'default',
          data: { label: pairLabel },
          position: { x: 0, y: idx * verticalSpacing },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          style: {
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            fontWeight: 'bold',
            border: '2px solid #1f2937',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px',
            whiteSpace: 'pre-line',
            textAlign: 'center',
          },
        });

        visited.add(`${startWordId}-${word2Id}-0`);
        queue.push({
          word1Id: startWordId,
          word2Id: word2Id,
          word1: startWord,
          word2: word2,
          level: 0,
          parentId: nodeId,
        });
      });

      while (queue.length > 0) {
        const item = queue.shift()!;
        const { word1Id, word2Id, word2, level, parentId } = item;

        if (level >= depth) continue;

        // Get transitions from this word pair
        const contexts = trigramModel.map[String(word1Id)] || {};
        const transitions = contexts[String(word2Id)] || {};

        // Flatten all word IDs across all characters and limit to top 10
        const allNextWords: number[] = [];
        Object.values(transitions).forEach((wordIds) => {
          allNextWords.push(...wordIds);
        });

        // Take top 10 unique words
        const uniqueNextWords = Array.from(new Set(allNextWords)).slice(0, 10);

        uniqueNextWords.forEach((word3Id, idx) => {
          const word3 = model.vocab[word3Id];
          const nodeId = `pair-${word2Id}-${word3Id}-${level + 1}-${levelCounts[level + 1]}`;
          const pairLabel = `${word2}\n${word3}`;
          const yPos = levelCounts[level + 1] * verticalSpacing;
          levelCounts[level + 1]++;

          nodes.push({
            id: nodeId,
            type: 'default',
            data: { label: pairLabel },
            position: { x: (level + 1) * horizontalSpacing, y: yPos },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            style: {
              backgroundColor: '#ffffff',
              color: '#1f2937',
              border: '2px solid #1f2937',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '13px',
              whiteSpace: 'pre-line',
              textAlign: 'center',
            },
          });

          // Edge with probability score
          const score = (1.0 - (idx * 0.1)).toFixed(2);
          edges.push({
            id: `edge-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            label: score,
            type: ConnectionLineType.Straight,
            style: {
              stroke: '#1f2937',
              strokeWidth: 2,
            },
            labelStyle: {
              fontSize: '12px',
              fill: '#1f2937',
              fontWeight: 'bold',
            },
            labelBgStyle: {
              fill: '#ffffff',
              fillOpacity: 0.8,
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#1f2937',
              width: 20,
              height: 20,
            },
          });

          // Add to queue for next level
          if (level + 1 < depth) {
            const key = `${word2Id}-${word3Id}-${level + 1}`;
            if (!visited.has(key)) {
              visited.add(key);
              queue.push({
                word1Id: word2Id,
                word2Id: word3Id,
                word1: word2,
                word2: word3,
                level: level + 1,
                parentId: nodeId,
              });
            }
          }
        });
      }
    }

    return { nodes, edges };
  }, [model, startWordId, startWord, depth]);

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">
          {model.type === ModelType.BIGRAM ? 'Bigram' : 'Trigram'} Model Visualization
        </h2>
        <div className="text-xs text-gray-600">
          Mouse wheel / trackpad to zoom. Left button to pan (click and drag).
        </div>
      </div>

      <div
        style={{
          width: '100%',
          height: '700px',
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.1,
            maxZoom: 1,
          }}
          attributionPosition="bottom-right"
          minZoom={0.05}
          maxZoom={2}
          defaultEdgeOptions={{
            type: ConnectionLineType.Straight,
          }}
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-700 mb-2">Legend</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded border-2 border-gray-800" />
            <span>{model.type === ModelType.BIGRAM ? 'Starting word' : 'Starting word pair'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white rounded border-2 border-gray-800" />
            <span>{model.type === ModelType.BIGRAM ? 'Word group' : 'Word pair'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="w-8 h-0.5 bg-gray-800" />
              <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-800" />
            </div>
            <span>
              {model.type === ModelType.BIGRAM
                ? 'Transition (character label)'
                : 'Transition (probability score)'}
            </span>
          </div>
          <div className="text-gray-500 italic">
            {model.type === ModelType.BIGRAM
              ? 'Shows words grouped by starting character'
              : 'Shows word pairs with context-dependent transitions'}
          </div>
        </div>
      </div>
    </div>
  );
}
