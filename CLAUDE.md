# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Semantic Steganographic Encoder** that hides secret messages in grammatically coherent sentences using a bigram N-gram model with beam search. The first letter of each word in the generated sentence encodes a character from the secret message.

### Architecture

The project consists of several components:

1. **Python Data Builder** (`data_builder.py`): Offline preprocessing script that builds the bigram model from a text corpus
2. **Python Steganography Engine** (`steganography.py`): Reference implementation with training and encoding/decoding logic
3. **Vite-based Web Client**:
   - `index.html`: Main UI structure
   - `src/main.js`: Core encoding/decoding logic with beam search and DP word splitting (ES modules)
   - `src/style.css`: Custom styling and animations
   - `public/model_data.json`: Pre-built bigram model served as static asset
4. **Backup Directory** (`backup/`): Contains older versions and experimental implementations
   - `data_builder.py`: Previous version of the data builder
   - `steganography.py`: Previous version of the steganography engine
   - `with_temprature.html`: Experimental implementation with temperature controls

### Key Algorithm Components

- **Beam Search Encoder**: Explores multiple sentence paths simultaneously, prioritizing grammatically probable sequences based on bigram transitions
- **Sentence Break Mechanism**: When bigram transitions don't exist, creates natural sentence boundaries with periods instead of using penalized fallback words
- **DP Word Splitter**: Uses dynamic programming to optimally split decoded character strings into readable words from the vocabulary, minimizing unrecognized characters

## Development Commands

### Building the Model Data

Generate the compressed bigram model (`model_data.json`) from a text corpus:

```bash
python data_builder.py
```

This downloads WikiText-2 corpus (cached in `.cache/`), builds vocabulary and transition graph, and outputs `model_data.json` (approx 1.4 MB). The generated file should be placed in the `public/` directory.

**Configuration parameters in `data_builder.py`**:
- `TOP_K_PER_LETTER`: Number of bigram suggestions per starting letter (default: 30)
- `MIN_BIGRAM_FREQ`: Minimum frequency threshold for valid word pairs (default: 2)

### Testing the Python Implementation

Run the standalone steganography engine:

```bash
python steganography.py
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

### JavaScript Side (Vite + ES Modules)

- **Module System**: Uses ES6 imports with Vite bundler, separated into `main.js` and `encoder.js`
- **Model Loading**: Fetches `/model_data.json` from public directory and builds `wordsByChar` lookup on initialization (`src/main.js:loadModel()`)
- **Candidate Selection** (`src/encoder.js:getCandidates()`):
  - Uses bigram transitions first for coherent flow
  - Returns `SENTENCE_BREAK_ID` when no bigram exists (small penalty: -0.5)
  - Handles sentence starts after breaks by providing fresh word candidates
- **Sentence Break Handling** (`src/encoder.js:encodeText()`):
  - Detects `SENTENCE_BREAK_ID` during beam search
  - Ends current sentence with period and starts new sentence
  - Continues encoding with same character from fresh sentence start
  - Produces multiple properly capitalized sentences
- **Simplified Scoring**: JavaScript uses `baseScore - (index * 0.1)` instead of true log probabilities (assumes sorted order implies probability)
- **Word Splitting**: Dynamic programming algorithm (`src/encoder.js:splitIntoWords()`) that:
  - Builds a Set from vocabulary for O(1) lookups
  - Uses DP table to track minimum unrecognized characters
  - Reconstructs optimal word boundaries via parent pointers
  - Time complexity: O(n²) where n is decoded string length

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
├── index.html              # Main UI structure (Vite entry point)
├── package.json            # NPM dependencies and scripts
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.js             # UI logic and model loading (ES modules)
│   ├── encoder.js          # Core encoding/decoding logic with sentence breaks
│   ├── encoder.test.js     # Comprehensive test suite (43 tests)
│   └── style.css           # Custom styling and animations
├── public/
│   └── model_data.json     # Pre-built bigram model (1.4 MB, static asset)
├── data_builder.py         # Builds bigram model from corpus
├── steganography.py        # Python reference implementation
├── CLAUDE.md               # This file
├── README.md               # Project documentation
├── .cache/                 # Cached corpus data
├── .gitignore              # Git ignore rules (includes node_modules, dist)
└── backup/                 # Older versions and experiments
    ├── data_builder.py
    ├── steganography.py
    └── with_temprature.html
```

## Recent Improvements

- **Sentence Break Enhancement**: Replaced fallback penalty mechanism with natural sentence boundaries
  - When bigram transitions don't exist, creates new sentences with periods
  - Produces more grammatically coherent and natural-looking cover text
  - Small penalty (-0.5) instead of heavy fallback penalty (-20.0)
  - Ensures encoding always completes without dead ends
- **Comprehensive Testing**: Added 43 tests with vitest covering all features including sentence breaks
- **Code Refactoring**: Separated encoding logic into dedicated `encoder.js` module
- **Vite Migration**: Migrated to Vite for modern build tooling with HMR and optimized production builds
- **ES Modules**: Converted to ES6 module system for better code organization and tree-shaking
- **Word Splitting Feature**: Decoded messages are now automatically split into readable words using DP algorithm
- **UI Enhancement**: Added "Decoded Message (Word Split)" section to display human-readable decoded output

## Future Improvements

- UI controls for beam width and sentence break penalty
- Custom text corpus upload
- Bigram visualization
- Tri-gram and multi-gram support
- Enhanced word splitting with dictionary optimization
- Support for multiple punctuation marks (!, ?) beyond periods
- Configurable sentence length limits to force breaks
