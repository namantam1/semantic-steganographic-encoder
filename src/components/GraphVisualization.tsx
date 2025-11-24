import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  ConnectionLineType,
  Position,
  Handle,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Model, ModelType } from '../../lib/types';
import { SENTENCE_BREAK_ID } from '../visualizer-logic';

interface GraphVisualizationProps {
  show: boolean;
  currentWord: string;
  currentWordId: number;
  candidates: Array<[number, number]>;
  modelData: Model | null;
  targetChar: string;
  prevWordId?: number; // For trigram models
}

// Custom node component for grouped candidates
function GroupedCandidatesNode({ data }: { data: { items: Array<[string, number]> } }) {
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
      {data.items.map(([word, score], idx) => (
        <div
          key={idx}
          style={{
            fontSize: '13px',
            color: '#1f2937',
            padding: '2px 0',
            textAlign: 'left',
          }}
        >
          {word} ({score.toFixed(2)})
        </div>
      ))}
    </div>
  );
}

const nodeTypes = {
  groupedCandidates: GroupedCandidatesNode,
};

function GraphVisualizationComponent({
  show,
  currentWord,
  currentWordId,
  candidates,
  modelData,
}: GraphVisualizationProps) {
  const { fitView } = useReactFlow();

  // Get second-level candidates for each first-level candidate
  const getSecondLevelCandidates = useCallback((wordId: number): Array<[string, number]> => {
    if (!modelData || wordId === SENTENCE_BREAK_ID) return [];

    const nextWords: Array<[string, number]> = [];

    // Handle different model types
    if (modelData.type === ModelType.BIGRAM) {
      const wordIdStr = String(wordId);
      const transitions = modelData.map[wordIdStr];
      if (!transitions) return [];

      const chars = Object.keys(transitions).slice(0, 2);

      chars.forEach((char) => {
        const wordIds = transitions[char];
        if (Array.isArray(wordIds) && wordIds.length > 0) {
          // Get multiple candidates per character (up to 3)
          wordIds.slice(0, 3).forEach((nextWordId, idx) => {
            const nextWord = modelData.vocab[nextWordId];
            const score = 1.0 - (idx * 0.2) - (nextWords.length * 0.05);
            nextWords.push([nextWord, score]);
          });
        }
      });
    } else if (modelData.type === ModelType.TRIGRAM) {
      // For trigram, we need both previous and current word
      const prevWordIdStr = String(currentWordId);
      const currentWordIdStr = String(wordId);

      const transitions = modelData.map[prevWordIdStr]?.[currentWordIdStr];
      if (!transitions) return [];

      const chars = Object.keys(transitions).slice(0, 2);

      chars.forEach((char) => {
        const wordIds = transitions[char];
        if (Array.isArray(wordIds) && wordIds.length > 0) {
          // Get multiple candidates per character (up to 3)
          wordIds.slice(0, 3).forEach((nextWordId, idx) => {
            const nextWord = modelData.vocab[nextWordId];
            const score = 1.0 - (idx * 0.2) - (nextWords.length * 0.05);
            nextWords.push([nextWord, score]);
          });
        }
      });
    }

    return nextWords;
  }, [modelData, currentWordId]);

  // Get third-level candidates (only for trigram models)
  const getThirdLevelCandidates = useCallback((prevWordId: number, currentWordId: number): Array<[string, number]> => {
    if (!modelData || modelData.type !== ModelType.TRIGRAM) return [];
    if (prevWordId === SENTENCE_BREAK_ID || currentWordId === SENTENCE_BREAK_ID) return [];

    const nextWords: Array<[string, number]> = [];
    const prevWordIdStr = String(prevWordId);
    const currentWordIdStr = String(currentWordId);

    const transitions = modelData.map[prevWordIdStr]?.[currentWordIdStr];
    if (!transitions) return [];

    const chars = Object.keys(transitions).slice(0, 2);

    chars.forEach((char) => {
      const wordIds = transitions[char];
      if (Array.isArray(wordIds) && wordIds.length > 0) {
        // Get fewer candidates for level 3 to avoid clutter (up to 2)
        wordIds.slice(0, 2).forEach((nextWordId, idx) => {
          const nextWord = modelData.vocab[nextWordId];
          const score = 0.8 - (idx * 0.2) - (nextWords.length * 0.05);
          nextWords.push([nextWord, score]);
        });
      }
    });

    return nextWords;
  }, [modelData]);

  // Build nodes and edges for React Flow
  const { nodes, edges } = useMemo(() => {
    if (!show || !modelData) {
      return { nodes: [], edges: [] };
    }

    const displayCandidates = candidates.slice(0, 3);
    const numCandidates = displayCandidates.length;
    const verticalSpacing = 200;
    const horizontalSpacing = 250;

    // Center the root vertically based on number of candidates
    const totalHeight = (numCandidates - 1) * verticalSpacing;
    const centerY = totalHeight / 2;

    const nodes: Node[] = [
      {
        id: 'root',
        type: 'default',
        data: { label: currentWord },
        position: { x: 0, y: centerY },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          backgroundColor: '#ffffff',
          color: '#1f2937',
          fontWeight: 'normal',
          border: '1px solid #1f2937',
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '14px',
        },
      },
    ];

    const edges: Edge[] = [];

    displayCandidates.forEach(([wordId, score], idx) => {
      const isBreak = wordId === SENTENCE_BREAK_ID;
      const word = isBreak ? '<PERIOD>' : modelData.vocab[wordId];
      const nodeId = `level1-${idx}`;

      // Calculate vertical position for level 1 nodes (evenly spaced)
      const level1Y = idx * verticalSpacing;

      nodes.push({
        id: nodeId,
        type: 'default',
        data: { label: word },
        position: { x: horizontalSpacing, y: level1Y },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          backgroundColor: '#ffffff',
          border: '1px solid #1f2937',
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '14px',
          fontStyle: isBreak ? 'italic' : 'normal',
        },
      });

      edges.push({
        id: `edge-root-${idx}`,
        source: 'root',
        target: nodeId,
        label: Math.abs(score).toFixed(2),
        type: ConnectionLineType.Straight,
        style: {
          stroke: '#1f2937',
          strokeWidth: 2,
        },
        labelStyle: {
          fontSize: '12px',
          fill: '#1f2937',
          fontWeight: '500',
        },
        labelBgStyle: {
          fill: 'transparent',
        },
        markerEnd: {
          type: 'arrowclosed',
          color: '#1f2937',
          width: 20,
          height: 20,
        },
      });

      // Add second level as grouped node with edge
      if (!isBreak) {
        const secondLevel = getSecondLevelCandidates(wordId);
        if (secondLevel.length > 0) {
          const level2Id = `level2-${idx}`;

          nodes.push({
            id: level2Id,
            type: 'groupedCandidates',
            data: { items: secondLevel },
            position: { x: horizontalSpacing * 2, y: level1Y - 60 },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });

          edges.push({
            id: `edge-${nodeId}-grouped`,
            source: nodeId,
            target: level2Id,
            type: ConnectionLineType.Straight,
            style: {
              stroke: '#1f2937',
              strokeWidth: 2,
            },
            markerEnd: {
              type: 'arrowclosed',
              color: '#1f2937',
              width: 20,
              height: 20,
            },
          });

          // Add third level for trigram models (showing deeper lookahead)
          if (modelData.type === ModelType.TRIGRAM && secondLevel.length > 0) {
            // Get the word ID from the first item in secondLevel to show what comes next
            // We'll create grouped third-level nodes for the first few second-level items
            secondLevel.slice(0, 2).forEach(([secondLevelWord, _], secondIdx) => {
              // Find the word ID for this second-level word
              const secondLevelWordId = modelData.vocab.indexOf(secondLevelWord);
              if (secondLevelWordId === -1) return;

              // Get third-level candidates using the context: [wordId, secondLevelWordId]
              const thirdLevel = getThirdLevelCandidates(wordId, secondLevelWordId);
              if (thirdLevel.length > 0) {
                const level3Id = `level3-${idx}-${secondIdx}`;

                nodes.push({
                  id: level3Id,
                  type: 'groupedCandidates',
                  data: { items: thirdLevel },
                  position: {
                    x: horizontalSpacing * 3,
                    y: level1Y - 60 + (secondIdx * 120)
                  },
                  sourcePosition: Position.Right,
                  targetPosition: Position.Left,
                  style: {
                    opacity: 0.85, // Slightly faded to indicate deeper level
                  },
                });

                edges.push({
                  id: `edge-${level2Id}-${level3Id}`,
                  source: level2Id,
                  target: level3Id,
                  type: ConnectionLineType.Straight,
                  style: {
                    stroke: '#6b7280',
                    strokeWidth: 1.5,
                    opacity: 0.7,
                  },
                  markerEnd: {
                    type: 'arrowclosed',
                    color: '#6b7280',
                    width: 16,
                    height: 16,
                  },
                });
              }
            });
          }
        }
      }
    });

    return { nodes, edges };
  }, [show, currentWord, candidates, modelData, getSecondLevelCandidates, getThirdLevelCandidates]);

  useEffect(() => {
    if (nodes.length > 0) {
      fitView({ duration: 200, padding: 0.1 });
    }
  }, [nodes, fitView]);

  if (!show) return null;

  const modelTypeName = modelData?.type === ModelType.TRIGRAM ? 'Tri-gram' : 'Bi-gram';

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">[4] Visualize {modelTypeName}.</h2>
        <div className="text-xs text-gray-600">
          Mouse wheel / trackpad to zoom. Left button to pan (click and drag).
        </div>
      </div>

      <div
        style={{
          width: '100%',
          height: '500px',
          backgroundColor: '#ffffff',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          attributionPosition="bottom-right"
          minZoom={0.3}
          maxZoom={3}
          defaultEdgeOptions={{
            type: ConnectionLineType.Straight,
          }}
        >
          <Background color="#e5e7eb" gap={16} />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}


export function GraphVisualization(props: GraphVisualizationProps) {
  return (
    <ReactFlowProvider>
      <GraphVisualizationComponent {...props} />
    </ReactFlowProvider>
  );
}