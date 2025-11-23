import { CopyButton } from './CopyButton';

interface DecodedVerificationProps {
  original: string;
  decoded: string;
}

export function DecodedVerification({ original, decoded }: DecodedVerificationProps) {
  const isMatch = original === decoded;
  const textColor = isMatch ? 'text-green-700' : 'text-red-700';
  const bgColor = isMatch ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isMatch ? 'border-green-200' : 'border-red-200';
  const displayText = original || decoded
    ? `Original: ${original} | Decoded: ${decoded}`
    : 'Decoded message verification (first letter of each word).';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Verification</h2>
        {decoded && <CopyButton text={decoded} />}
      </div>
      <div className={`h-24 p-4 ${bgColor} border ${borderColor} rounded-lg ${textColor} font-mono text-sm break-words overflow-y-auto`}>
        {displayText}
      </div>
      {isMatch && original && (
        <div className="mt-2 text-xs text-green-600 font-medium">
          ✓ Encoding successful
        </div>
      )}
    </div>
  );
}
