interface TabsProps {
  activeTab: 'encoder' | 'decoder';
  onTabChange: (tab: 'encoder' | 'decoder') => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex space-x-2 border-b border-gray-200">
      <button
        onClick={() => onTabChange('encoder')}
        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
          activeTab === 'encoder'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Encoder
      </button>
      <button
        onClick={() => onTabChange('decoder')}
        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${
          activeTab === 'decoder'
            ? 'border-purple-600 text-purple-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        Decoder
        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold">
          BETA
        </span>
      </button>
    </div>
  );
}
