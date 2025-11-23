# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Semantic Steganographic Encoder** that hides secret messages in grammatically coherent sentences using a bigram N-gram model with beam search. The first letter of each word in the generated sentence encodes a character from the secret message.

### Architecture

The project consists of several components:

1. **React/TypeScript Web Client** (main application):
   - `index.html`: Main UI structure (Vite entry point)
   - `src/main.tsx`: Application entry point (React)
   - `src/App.tsx`: Main encoder UI component with React hooks
   - `src/encoder.ts`: Core encoding/decoding logic with beam search and DP word splitting
   - `src/encoder.test.ts`: Comprehensive test suite (vitest)
   - `src/Visualizer.tsx`: Bigram graph visualization component
   - `src/visualizer-logic.ts`: Visualization algorithms (graph layout, filtering)
   - `src/visualizer-logic.test.ts`: Visualizer test suite
   - `src/style.css`: Main application styling
   - `src/visualizer.css`: Visualizer-specific styles
   - `public/model_data.json`: Pre-built bigram model served as static asset (~1.4 MB)
2. **Python Scripts** (`scripts/`): Model generation utilities
   - `data_builder.py`: Builds bigram model from WikiText-2 corpus (offline preprocessing)
   - `pyproject.toml`: Python dependencies (managed by uv)
   - `README.md`: Python scripts documentation
3. **Legacy/Backup** (`backup/`): Reference implementations
   - `steganography.py`: Python reference implementation with training and encoding/decoding
   - `with_temprature.html`: Experimental vanilla JS implementation with temperature controls

### Key Algorithm Components

- **Beam Search Encoder**: Explores multiple sentence paths simultaneously, prioritizing grammatically probable sequences based on bigram transitions
- **Sentence Break Mechanism**: When bigram transitions don't exist, creates natural sentence boundaries with periods instead of using penalized fallback words
- **DP Word Splitter**: Uses dynamic programming to optimally split decoded character strings into readable words from the vocabulary, minimizing unrecognized characters

## Development Commands

### Building the Model Data (Optional)

The project includes a pre-built `public/model_data.json` file. If you need to rebuild it from scratch:

```bash
cd scripts
python data_builder.py
```

This downloads WikiText-2 corpus (cached in `.cache/`), builds vocabulary and transition graph, and outputs `model_data.json` (approx 1.4 MB) directly to the `../public/` directory.

**Configuration parameters in `scripts/data_builder.py`**:
- `TOP_K_PER_LETTER`: Number of bigram suggestions per starting letter (default: 30)
- `MIN_BIGRAM_FREQ`: Minimum frequency threshold for valid word pairs (default: 2)

See `scripts/README.md` for detailed documentation.

### Testing the Python Implementation (Optional)

Run the standalone Python reference implementation:

```bash
python backup/steganography.py
```

This trains a model on the embedded test corpus and encodes/decodes the test message "I am good".

### Running the Web UI (Vite Development Server)

**Install dependencies first:**
```bash
npm install
```

**Start development server:**
```bash
npm run dev
```

This starts Vite's dev server with Hot Module Replacement (HMR) at `http://localhost:3000`

**Build for production:**
```bash
npm run build
```

Outputs optimized bundle to `dist/` directory

**Preview production build:**
```bash
npm run preview
```

**Run tests:**
```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

The test suite includes 43 comprehensive tests covering:
- Core encoding/decoding functions
- Sentence break mechanism
- Edge cases and integration tests

## Data Structure

### `model_data.json` Format

```json
{
  "vocab": ["the", "in", "afternoon", ...],  // Array where index = Word ID
  "map": {
    "1": {                                   // Current word ID
      "a": [2, 55, 90],                     // Next word IDs starting with 'a'
      "t": [0, 10]                          // Next word IDs starting with 't'
    }
  }
}
```

### JavaScript Client Parameters

In `src/encoder.js`:
- `BEAM_WIDTH`: Number of paths to maintain in beam search (default: 20)
- `SENTENCE_BREAK_ID`: Special marker (-1) used to signal sentence boundaries

## Code Architecture Notes

### Python Side

- **Preprocessing**: Lowercase, remove non-alphabetic chars, tokenize on whitespace
- **Bigram Building**: Counts word pair frequencies, groups by next word's starting character
- **Log Probabilities**: Python implementation uses `log(count/total)` for transition scores

### React/TypeScript Client (Vite + ES Modules)

- **Module System**: Uses ES6 imports with Vite bundler and TypeScript, organized into:
  - `src/main.tsx`: React application entry point
  - `src/App.tsx`: Main UI component with React hooks (useState, useEffect)
  - `src/encoder.ts`: Pure encoding/decoding functions (type-safe, easily testable)
  - `src/Visualizer.tsx`: Interactive bigram graph visualization with D3.js-style rendering
  - `src/visualizer-logic.ts`: Graph layout algorithms (force-directed, filtering)
- **Model Loading** (`src/App.tsx`):
  - Fetches `/model_data.json` from public directory using React hooks
  - Builds `wordsByChar` lookup for O(1) access to words by starting character
  - Manages model state with useState and loads on component mount
- **Candidate Selection** (`src/encoder.ts:getCandidates()`):
  - Uses bigram transitions first for coherent flow
  - Returns `SENTENCE_BREAK_ID` (-1) when no bigram exists (small penalty: -0.5)
  - Handles sentence starts after breaks by providing fresh word candidates
- **Sentence Break Handling** (`src/encoder.ts:encodeText()`):
  - Detects `SENTENCE_BREAK_ID` during beam search
  - Ends current sentence with period and starts new sentence
  - Continues encoding with same character from fresh sentence start
  - Produces multiple properly capitalized sentences
- **Simplified Scoring**: Uses `baseScore - (index * 0.1)` instead of true log probabilities (assumes sorted order implies probability)
- **Word Splitting** (`src/encoder.ts:splitIntoWords()`):
  - Dynamic programming algorithm that optimally splits decoded character strings
  - Builds a Set from vocabulary for O(1) lookups
  - Uses DP table to track minimum unrecognized characters
  - Reconstructs optimal word boundaries via parent pointers
  - Time complexity: O(n²) where n is decoded string length
- **Visualization** (`src/visualizer-logic.ts`):
  - Force-directed graph layout for bigram transitions
  - Interactive node filtering by starting character
  - Edge weight visualization based on transition probabilities
- **Testing**:
  - `src/encoder.test.ts`: Comprehensive encoder tests using vitest
  - `src/visualizer-logic.test.ts`: Visualization algorithm tests
  - Mock model with controlled vocabulary and transitions
  - Tests for: basic encoding/decoding, sentence breaks, edge cases, word splitting, graph layout
  - Run with `npm run test` (watch) or `npm run test:run` (single run)

## Important Behaviors

1. **Corpus Dependency**: Quality of generated sentences depends heavily on corpus size and diversity
2. **First Character Limitation**: Can only encode lowercase a-z letters (spaces and punctuation are ignored)
3. **Beam Width Trade-off**: Larger beam = better quality but slower; smaller beam = faster but may produce less coherent text
4. **Sentence Breaks**: When bigram transitions don't exist, the encoder automatically creates sentence boundaries for natural flow
5. **Multiple Sentences**: Output may contain multiple sentences separated by periods, each properly capitalized
6. **No Dead Ends**: The sentence break mechanism ensures encoding always completes successfully

## File Structure

```
.
├── index.html              # Main encoder UI (Vite entry point)
├── visualizer.html         # Bigram graph visualizer UI
├── package.json            # NPM dependencies (vite, vitest, react, typescript)
├── vite.config.ts          # Vite configuration (TypeScript, multi-page setup)
├── tsconfig.json           # TypeScript compiler configuration
├── tsconfig.node.json      # TypeScript config for Vite build scripts
├── src/
│   ├── main.tsx            # React entry point for encoder
│   ├── App.tsx             # Main encoder UI component
│   ├── encoder.ts          # Core encoding/decoding algorithms
│   ├── encoder.test.ts     # Encoder test suite (vitest)
│   ├── visualizer-main.tsx # React entry point for visualizer
│   ├── Visualizer.tsx      # Bigram graph visualization component
│   ├── visualizer-logic.ts # Graph layout and filtering algorithms
│   ├── visualizer-logic.test.ts # Visualizer test suite
│   ├── style.css           # Main application styles
│   ├── visualizer.css      # Visualizer-specific styles
│   └── vite-env.d.ts       # Vite TypeScript declarations
├── public/
│   └── model_data.json     # Pre-built bigram model (~1.4 MB, static asset)
├── scripts/                # Python build scripts
│   ├── __init__.py         # Python package marker
│   ├── data_builder.py     # Builds bigram model from WikiText-2 corpus
│   ├── pyproject.toml      # Python dependencies (uv)
│   ├── uv.lock             # Python lock file
│   └── README.md           # Scripts documentation
├── backup/                 # Legacy implementations
│   ├── steganography.py    # Python reference implementation
│   └── with_temprature.html # Experimental vanilla JS version
├── CLAUDE.md               # This file (guidance for Claude Code)
├── README.md               # Project documentation
├── .cache/                 # Cached corpus data (gitignored)
├── .venv/                  # Python virtual environment (gitignored)
├── .gitignore              # Git ignore rules
├── node_modules/           # NPM dependencies (gitignored)
└── dist/                   # Production build output (gitignored)
```

## Recent Improvements

- **React/TypeScript Migration**: Migrated from vanilla JS to React 18 with TypeScript
  - Type-safe development with full TypeScript support
  - Component-based architecture with React hooks
  - Better code organization and maintainability
  - Multi-page Vite setup for encoder and visualizer
- **Bigram Graph Visualizer**: Added interactive visualization tool
  - Force-directed graph layout of bigram transitions
  - Interactive filtering by starting character
  - Visual representation of transition probabilities
  - Separate visualizer page with dedicated UI
- **Sentence Break Enhancement**: Replaced fallback penalty mechanism with natural sentence boundaries
  - When bigram transitions don't exist, creates new sentences with periods
  - Produces more grammatically coherent and natural-looking cover text
  - Small penalty (-0.5) instead of heavy fallback penalty (-20.0)
  - Ensures encoding always completes without dead ends
- **Comprehensive Testing**: Test suites for both encoder and visualizer
  - Encoder tests covering encoding/decoding, sentence breaks, edge cases
  - Visualizer tests for graph layout and filtering algorithms
  - All tests using vitest with TypeScript support
- **Word Splitting Feature**: Decoded messages automatically split into readable words using DP algorithm
- **Python Environment**: Added uv-based Python project management for model generation

## Future Improvements

- UI controls for beam width and sentence break penalty
- Custom text corpus upload
- Bigram visualization
- Tri-gram and multi-gram support
- Enhanced word splitting with dictionary optimization
- Support for multiple punctuation marks (!, ?) beyond periods
- Configurable sentence length limits to force breaks
