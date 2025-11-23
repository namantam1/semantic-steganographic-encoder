import { CopyButton } from './CopyButton';

interface CoverTextDisplayProps {
  coverText: string;
}

export function CoverTextDisplay({ coverText }: CoverTextDisplayProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Encoded Cover Text</h2>
        {coverText && <CopyButton text={coverText} />}
      </div>
      <div className="min-h-32 p-4 bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-lg text-gray-800 whitespace-pre-wrap break-words select-all text-lg leading-relaxed">
        {coverText || 'The resulting sentence will appear here.'}
      </div>
    </div>
  );
}
