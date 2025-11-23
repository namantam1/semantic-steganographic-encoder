import { useCallback, useMemo } from 'react';
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
import { Model, SENTENCE_BREAK_ID } from '../visualizer-logic';

interface GraphVisualizationProps {
  show: boolean;
  currentWord: string;
  currentWordId: number;
  candidates: Array<[number, number]>;
  modelData: Model | null;
  targetChar: string;
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

export function GraphVisualization({
  show,
  currentWord,
  candidates,
  modelData,
}: GraphVisualizationProps) {
  // Get second-level candidates for each first-level candidate
  const getSecondLevelCandidates = useCallback((wordId: number): Array<[string, number]> => {
    if (!modelData || wordId === SENTENCE_BREAK_ID) return [];

    const wordIdStr = String(wordId);
    const transitions = modelData.map[wordIdStr];
    if (!transitions) return [];

    const nextWords: Array<[string, number]> = [];
    const chars = Object.keys(transitions).slice(0, 2);

    chars.forEach((char) => {
      const wordIds = transitions[char];
      if (wordIds && wordIds.length > 0) {
        // Get multiple candidates per character (up to 3)
        wordIds.slice(0, 3).forEach((nextWordId, idx) => {
          const nextWord = modelData.vocab[nextWordId];
          const score = 1.0 - (idx * 0.2) - (nextWords.length * 0.05);
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
        }
      }
    });

    return { nodes, edges };
  }, [show, currentWord, candidates, modelData, getSecondLevelCandidates]);

  if (!show) return null;

  return (
    <div className="container-card bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">[4] Visualize Bi-gram.</h2>
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
          fitView
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
