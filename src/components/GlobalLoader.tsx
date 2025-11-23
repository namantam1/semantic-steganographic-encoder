interface GlobalLoaderProps {
  message?: string;
}

export function GlobalLoader({ message = 'Loading...' }: GlobalLoaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm">
      <div className="bg-white/95 border-b border-gray-200 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-gray-700">{message}</span>
          </div>
        </div>
        {/* Progress bar animation */}
        <div className="h-1 bg-gray-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 animate-progress"></div>
        </div>
      </div>
    </div>
  );
}
