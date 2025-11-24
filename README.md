# Semantic Steganographic Encoder

A **Vite-powered** steganographic encoder that hides secret messages in grammatically coherent sentences using a bigram N-gram model with beam search. The first letter of each word in the generated sentence encodes a character from the secret message.

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## Algorithm Overview

The goal is to generate a semantically coherent "Cover Sentence" where the first letter of each word corresponds to a character in the hidden "Secret Message." The architecture uses Vite for modern bundling and ES modules for client-side execution.

### 1. Data Structure (The Compressed Model)

The model is pre-calculated offline (e.g., using Python) and served to the browser as a compact JSON object. It uses integer IDs for words to minimize file size.

| Component       | Description                                                                                                                                                        |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VOCAB`         | A list where the **index** is the Word ID, and the **value** is the word string.                                                                                   |
| `TRANSITIONS`   | The N-Gram map. Keys are the current Word ID (as a string). Values are objects mapping the **required next starting character** to a list of likely next Word IDs. |
| `WORDS_BY_CHAR` | A lookup for all Word IDs grouped by their starting character (used for the first word and the Fallback mechanism).                                                |


```json5
MODEL_DATA = {
    "VOCAB": [ "the", "in", "afternoon", "my", ... ], // Index = ID
    "TRANSITIONS": {
        "1": {  // If current word ID is 1 ("in")
            "a": [2, 55, 90], // Likely next words starting with 'a' (IDs)
            "t": [0, 10],     // Likely next words starting with 't' (IDs)
            // ...
        }
        // ...
    }
}
```

---

### 2. The Encoding Process: Beam Search

The **Beam Search** algorithm ensures that we explore multiple paths simultaneously, prioritizing the most grammatically probable sequences (highest score) to produce a coherent output sentence.

#### 2.1. Initialization
1. **Clean Input:** Extract the sequence of required starting characters from the secret message (e.g., "I am good" $\rightarrow$ `['i', 'a', 'm', 'g', 'o', 'o', 'd']`).
2. **Initial Beam:** Initialize the beam with words from `WORDS_BY_CHAR` that start with the first required character. Each path starts with a score of `0.0`.
   * **Path:** `{ 'sequence': [word_id], 'score': float }`

#### 2.2. Iterative Search Loop

For each remaining required character in the sequence:

1.  **Generate Candidates:** For every existing path in the current beam, determine the valid next words using the function `GET_CANDIDATES`.
2.  **Extend Paths:** Create new paths by appending the candidates to the current path's sequence and adding the candidate's score to the path's total score.
3.  **Prune Beam:** Sort all new paths by their total score (descending) and keep only the top **Beam Width** (e.g., 5) paths. This prevents exponential growth.

#### 2.3. Candidate Selection (`GET_CANDIDATES`)

This function implements the core probability-based selection with a sentence break mechanism:


```js
GET_CANDIDATES(current_word_id, target_char)
// Strategy 1: N-Gram Lookup (Coherent Flow)
candidates = []

// Special case: Starting a new sentence
IF current_word_id == SENTENCE_BREAK_ID:
    // Return words for fresh sentence start
    candidates = WORDS_BY_CHAR[target_char]
    RETURN candidates with descending scores

transition_ids = TRANSITIONS[current_word_id][target_char]

IF transition_ids IS NOT EMPTY:
    // Assign a score based on assumed probability (first is highest)
    FOR each ID in transition_ids:
        score = BASE_SCORE - (index * 0.1) // Prefer the most frequent
        candidates.ADD(ID, score)

// Strategy 2: Sentence Break (Natural Flow)
ELSE IF candidates IS EMPTY:
    // Signal to end current sentence and start a new one
    candidates.ADD(SENTENCE_BREAK_ID, -0.5) // Small penalty for breaking

RETURN candidates // List of (Word ID, Score)
```

**Key Enhancement:** Instead of using heavily penalized fallback words, the algorithm now creates natural sentence boundaries with periods when bigram transitions don't exist. This produces more realistic and grammatically coherent cover text.

#### 2.4. Sentence Break Handling

When a `SENTENCE_BREAK_ID` is encountered during beam search:

1. Add the `SENTENCE_BREAK_ID` to the sequence
2. End the current sentence with a period
3. Start a new sentence with the same target character
4. Continue encoding normally with fresh word candidates

This creates output like: `"The cat sat. On mat today."` instead of forced awkward transitions.

#### 2.5. Final Output

1.  Select the path with the highest overall score from the final beam.
2.  Translate the sequence of Word IDs back into words using the `VOCAB` list.
3.  Split sequences at `SENTENCE_BREAK_ID` markers to create multiple sentences.
4.  Capitalize the first letter of each sentence and add periods.

---

### 3. The Decoding Process

Decoding is a straightforward verification step, as the constraint is explicit (first letter = secret character).


```js
DECODE(cover_sentence)
// 1. Clean the sentence to get only words
words = cover_sentence.SPLIT_BY_SPACE_AND_PUNCTUATION()

// 2. Extract first character of each word
decoded_chars = []
FOR each word in words:
    decoded_chars.ADD(word.FIRST_CHARACTER().TO_LOWER())

// 3. Join characters to form the original secret
RETURN decoded_chars.JOIN_AS_STRING()
```

---

## Project Structure

```
.
├── index.html              # Main encoder UI (Vite entry point)
├── visualizer.html         # Bigram visualizer UI
├── package.json            # NPM dependencies and scripts
├── vite.config.ts          # Vite configuration (TypeScript)
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── main.tsx            # Application entry point (React)
│   ├── App.tsx             # Main encoder UI component
│   ├── encoder.ts          # Core encoding/decoding logic
│   ├── encoder.test.ts     # Encoder test suite
│   ├── visualizer-main.tsx # Visualizer entry point
│   ├── Visualizer.tsx      # Bigram graph visualization component
│   ├── visualizer-logic.ts # Visualization algorithms
│   ├── visualizer-logic.test.ts # Visualizer test suite
│   ├── style.css           # Main application styles
│   └── visualizer.css      # Visualizer styles
├── public/
│   └── model_data.json     # Pre-built bigram model (~1.4 MB)
├── scripts/                # Python build scripts
│   ├── __init__.py
│   ├── data_builder.py     # Builds bigram model from corpus
│   ├── pyproject.toml      # Python dependencies (uv)
│   ├── uv.lock             # Python lock file
│   └── README.md           # Python scripts documentation
└── backup/                 # Legacy implementations
    ├── steganography.py    # Python reference implementation
    └── with_temprature.html # Experimental HTML version
```

## Building the Model

Generate `model_data.json` from a text corpus:

```bash
cd scripts
python data_builder.py
```

This downloads the WikiText-2 corpus and outputs `model_data.json` directly to the `public/` directory.

**Configuration** in `scripts/data_builder.py`:
- `TOP_K_PER_LETTER`: Bigram suggestions per letter (default: 30)
- `MIN_BIGRAM_FREQ`: Minimum frequency threshold (default: 2)

See `scripts/README.md` for more details.

## Technology Stack

- **React 18**: Modern UI framework with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool with HMR
- **Vitest**: Unit testing framework
- **Tailwind CSS**: Utility-first CSS (via CDN)
- **Python**: For offline model generation (optional)

## Features

- ✅ Beam search with configurable width
- ✅ Sentence break mechanism for natural text flow
- ✅ Dynamic programming word splitter for decoded output
- ✅ Comprehensive test suite (43 tests with vitest)
- ✅ ES6 modules with tree-shaking
- ✅ Hot Module Replacement (HMR)
- ✅ Optimized production builds

## Testing

Run the test suite:

```bash
npm run test        # Watch mode
npm run test:run    # Single run
```

Test coverage includes:
- Unit tests for all core functions
- Sentence break feature tests
- Integration tests for encode/decode workflow
- Edge case handling

## Ideas to Improve

- [ ] Add option to use custom text corpus
- [ ] Try tri-gram and multi-gram support
