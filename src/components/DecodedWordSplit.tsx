import { CopyButton } from './CopyButton';

interface DecodedWordSplitProps {
  decodedSplit: string;
}

export function DecodedWordSplit({ decodedSplit }: DecodedWordSplitProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Decoded Message</h2>
        {decodedSplit && <CopyButton text={decodedSplit} />}
      </div>
      <div className="h-24 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 font-medium text-sm break-words overflow-y-auto">
        {decodedSplit || 'Decoded message automatically split into words using vocabulary.'}
      </div>
      <div className="mt-2 text-xs text-gray-600">
        Automatically split using DP algorithm
      </div>
    </div>
  );
}
