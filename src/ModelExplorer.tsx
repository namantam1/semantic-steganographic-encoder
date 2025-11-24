import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './style.css';
import type { Model, BigramModel, TrigramModel, WordsByChar } from '../lib/types';
import { ModelType } from '../lib/types';
import { ModelExplorerGraph } from './components/ModelExplorerGraph';
import { ModelStatistics } from './components/ModelStatistics';

export default function ModelExplorer() {
  const [bigramModel, setBigramModel] = useState<BigramModel | null>(null);
  const [trigramModel, setTrigramModel] = useState<TrigramModel | null>(null);
  const [activeModel, setActiveModel] = useState<Model | null>(null);
  const [wordsByChar, setWordsByChar] = useState<WordsByChar>({});
  const [modelType, setModelType] = useState<ModelType>(ModelType.BIGRAM);
  const [searchType, setSearchType] = useState<'character' | 'word'>('character');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<string>('');
  const [selectedWordId, setSelectedWordId] = useState<number>(-1);
  const [depth, setDepth] = useState(2);
  const [filteredWords, setFilteredWords] = useState<Array<{ word: string; id: number }>>([]);

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      try {
        // Load bigram model
        const bigramResponse = await fetch('model_data.json');
        if (!bigramResponse.ok) {
          throw new Error(`HTTP error loading bigram model! status: ${bigramResponse.status}`);
        }
        const bigramData = await bigramResponse.json();
        const loadedBigramModel: BigramModel = {
          type: ModelType.BIGRAM,
          vocab: bigramData.vocab,
          map: bigramData.map,
        };
        setBigramModel(loadedBigramModel);
        console.log(`Bigram model loaded. Vocab size: ${loadedBigramModel.vocab.length}`);

        // Load trigram model
        const trigramResponse = await fetch('model_data_trigram.json');
        if (!trigramResponse.ok) {
          throw new Error(`HTTP error loading trigram model! status: ${trigramResponse.status}`);
        }
        const trigramData = await trigramResponse.json();
        const loadedTrigramModel: TrigramModel = {
          type: ModelType.TRIGRAM,
          vocab: trigramData.vocab,
          map: trigramData.map,
        };
        setTrigramModel(loadedTrigramModel);
        console.log(`Trigram model loaded. Vocab size: ${loadedTrigramModel.vocab.length}`);

        // Create the wordsByChar structure from bigram vocab (same for both models)
        const wordsByCharMap: WordsByChar = {};
        loadedBigramModel.vocab.forEach((word, idx) => {
          const firstChar = word[0];
          if (!wordsByCharMap[firstChar]) {
            wordsByCharMap[firstChar] = [];
          }
          wordsByCharMap[firstChar].push(idx);
        });
        setWordsByChar(wordsByCharMap);

        // Set initial active model to bigram
        setActiveModel(loadedBigramModel);
      } catch (error) {
        console.error('Error loading models:', error);
        alert('Failed to load model data');
      }
    }

    loadModels();
  }, []);

  // Update active model when model type changes
  useEffect(() => {
    if (modelType === ModelType.BIGRAM && bigramModel) {
      setActiveModel(bigramModel);
    } else if (modelType === ModelType.TRIGRAM && trigramModel) {
      setActiveModel(trigramModel);
    }
  }, [modelType, bigramModel, trigramModel]);

  // Filter words based on search query
  useEffect(() => {
    if (!activeModel || !searchQuery) {
      setFilteredWords([]);
      return;
    }

    if (searchType === 'character') {
      const char = searchQuery.toLowerCase()[0];
      if (char && /[a-z]/.test(char)) {
        const wordIds = wordsByChar[char] || [];
        const words = wordIds.slice(0, 50).map(id => ({
          word: activeModel.vocab[id],
          id,
        }));
        setFilteredWords(words);
      } else {
        setFilteredWords([]);
      }
    } else {
      // Word search
      const query = searchQuery.toLowerCase();
      const matches = activeModel.vocab
        .map((word, id) => ({ word, id }))
        .filter(({ word }) => word.toLowerCase().includes(query))
        .slice(0, 50);
      setFilteredWords(matches);
    }
  }, [searchQuery, searchType, activeModel, wordsByChar]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredWords.length > 0) {
      const first = filteredWords[0];
      setSelectedWord(first.word);
      setSelectedWordId(first.id);
    }
  };

  const handleWordClick = (word: string, id: number) => {
    setSelectedWord(word);
    setSelectedWordId(id);
    setSearchQuery(word);
    setFilteredWords([]);
  };

  return (
    <div className="p-4 sm:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="container-card bg-white rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Model Explorer</h1>
            <div className="flex gap-2">
              <Link
                to="/visualizer"
                className="px-4 py-2 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition duration-150"
              >
                Visualizer
              </Link>
              <Link
                to="/"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-150"
              >
                Encoder
              </Link>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Controls */}
          <div className="lg:col-span-4">
            <div className="sticky-sidebar lg:sticky lg:top-4 space-y-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
              {/* Model Selection */}
              <div className="container-card bg-white rounded-xl p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Model Settings</h2>

                {/* Model Type Toggle */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModelType(ModelType.BIGRAM)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition duration-150 ${
                        modelType === ModelType.BIGRAM
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Bigram
                    </button>
                    <button
                      onClick={() => setModelType(ModelType.TRIGRAM)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition duration-150 ${
                        modelType === ModelType.TRIGRAM
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Trigram
                    </button>
                  </div>
                </div>

                {/* Depth Slider */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visualization Depth: {depth}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 level</span>
                    <span>4 levels</span>
                  </div>
                </div>
              </div>

              {/* Search Section */}
              <div className="container-card bg-white rounded-xl p-4">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Search</h2>

                {/* Search Type Toggle */}
                <div className="mb-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSearchType('character')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                        searchType === 'character'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      By Character
                    </button>
                    <button
                      onClick={() => setSearchType('word')}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition duration-150 ${
                        searchType === 'word'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      By Word
                    </button>
                  </div>
                </div>

                {/* Search Input */}
                <form onSubmit={handleSearch} className="mb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={
                        searchType === 'character'
                          ? 'Enter a character (a-z)'
                          : 'Enter a word to search'
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="submit"
                      disabled={!searchQuery}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition duration-150"
                    >
                      Go
                    </button>
                  </div>
                </form>

                {/* Search Results */}
                {filteredWords.length > 0 && (
                  <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                    {filteredWords.map(({ word, id }) => (
                      <button
                        key={id}
                        onClick={() => handleWordClick(word, id)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 transition duration-150 border-b border-gray-200 last:border-b-0"
                      >
                        <span className="text-gray-800">{word}</span>
                        <span className="text-xs text-gray-500 ml-2">(ID: {id})</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Current Selection */}
                {selectedWord && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-600">Selected:</div>
                    <div className="font-semibold text-gray-800">
                      {selectedWord}
                      <span className="text-xs text-gray-500 ml-2">(ID: {selectedWordId})</span>
                    </div>
                    {modelType === ModelType.TRIGRAM && (
                      <div className="text-xs text-gray-600 mt-2 italic">
                        Trigram mode: Shows all word pairs starting with "{selectedWord}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Statistics */}
              {activeModel && selectedWordId >= 0 && (
                <ModelStatistics
                  model={activeModel}
                  wordId={selectedWordId}
                  word={selectedWord}
                />
              )}
            </div>
          </div>

          {/* Right Column - Visualization */}
          <div className="lg:col-span-8">
            {selectedWordId >= 0 && activeModel ? (
              <ModelExplorerGraph
                model={activeModel}
                startWordId={selectedWordId}
                startWord={selectedWord}
                depth={depth}
              />
            ) : (
              <div className="container-card bg-white rounded-xl p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-24 h-24 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Search for a word to begin
                </h3>
                <p className="text-gray-600">
                  Use the search panel on the left to find a starting word and explore the model
                  transitions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
