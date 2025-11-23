# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Semantic Steganographic Encoder** that hides secret messages in grammatically coherent sentences using a bigram N-gram model with beam search. The first letter of each word in the generated sentence encodes a character from the secret message.

### Architecture

The project consists of several components:

1. **Python Data Builder** (`data_builder.py`): Offline preprocessing script that builds the bigram model from a text corpus
2. **Python Steganography Engine** (`steganography.py`): Reference implementation with training and encoding/decoding logic
3. **JavaScript Web Client**:
   - `index.html`: Main UI structure
   - `app.js`: Core encoding/decoding logic with beam search and DP word splitting
   - `styles.css`: Custom styling and animations
4. **Backup Directory** (`backup/`): Contains older versions and experimental implementations
   - `data_builder.py`: Previous version of the data builder
   - `steganography.py`: Previous version of the steganography engine
   - `with_temprature.html`: Experimental implementation with temperature controls

### Key Algorithm Components

- **Beam Search Encoder**: Explores multiple sentence paths simultaneously, prioritizing grammatically probable sequences based on bigram transitions
- **Fallback Mechanism**: When bigram lookup fails, falls back to vocabulary lookup with heavy penalty to maintain progress
- **DP Word Splitter**: Uses dynamic programming to optimally split decoded character strings into readable words from the vocabulary, minimizing unrecognized characters

## Development Commands

### Building the Model Data

Generate the compressed bigram model (`model_data.json`) from a text corpus:

```bash
python data_builder.py
```

This downloads WikiText-2 corpus (cached in `.cache/`), builds vocabulary and transition graph, and outputs `model_data.json` (approx 1.4 MB).

**Configuration parameters in `data_builder.py`**:
- `TOP_K_PER_LETTER`: Number of bigram suggestions per starting letter (default: 30)
- `MIN_BIGRAM_FREQ`: Minimum frequency threshold for valid word pairs (default: 2)

### Testing the Python Implementation

Run the standalone steganography engine:

```bash
python steganography.py
```

This trains a model on the embedded test corpus and encodes/decodes the test message "I am good".

### Running the Web UI

Serve the HTML files via a local web server:

```bash
python -m http.server 8000
```

Then open:
- `http://localhost:8000/index.html` - Basic encoder/decoder

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

In `app.js`:
- `BEAM_WIDTH`: Number of paths to maintain in beam search (default: 20)
- `FALLBACK_PENALTY`: Score penalty for non-bigram words (default: -20.0)

## Code Architecture Notes

### Python Side

- **Preprocessing**: Lowercase, remove non-alphabetic chars, tokenize on whitespace
- **Bigram Building**: Counts word pair frequencies, groups by next word's starting character
- **Log Probabilities**: Python implementation uses `log(count/total)` for transition scores

### JavaScript Side

- **Model Loading**: Fetches `model_data.json` and builds `wordsByChar` lookup on initialization (`app.js:loadModel()`)
- **Candidate Selection**: Uses bigram transitions first, falls back to vocabulary lookup (`app.js:getCandidates()`)
- **Simplified Scoring**: JavaScript uses `baseScore - (index * 0.1)` instead of true log probabilities (assumes sorted order implies probability)
- **Word Splitting**: Dynamic programming algorithm (`app.js:splitIntoWords()`) that:
  - Builds a Set from vocabulary for O(1) lookups
  - Uses DP table to track minimum unrecognized characters
  - Reconstructs optimal word boundaries via parent pointers
  - Time complexity: O(n²) where n is decoded string length

## Important Behaviors

1. **Corpus Dependency**: Quality of generated sentences depends heavily on corpus size and diversity
2. **First Character Limitation**: Can only encode lowercase a-z letters (spaces and punctuation are ignored)
3. **Beam Width Trade-off**: Larger beam = better quality but slower; smaller beam = faster but may produce less coherent text
4. **Dead Ends**: If no valid word exists for a required character, encoding may fail or break grammatical flow

## File Structure

```
.
├── index.html              # Main UI structure
├── app.js                  # Core JavaScript logic (encoding, decoding, word splitting)
├── styles.css              # Custom styling and animations
├── data_builder.py         # Builds bigram model from corpus
├── steganography.py        # Python reference implementation
├── model_data.json         # Pre-built bigram model (1.4 MB)
├── CLAUDE.md               # This file
├── README.md               # Project documentation
├── .cache/                 # Cached corpus data
└── backup/                 # Older versions and experiments
    ├── data_builder.py
    ├── steganography.py
    └── with_temprature.html
```

## Recent Improvements

- **Word Splitting Feature**: Decoded messages are now automatically split into readable words using DP algorithm
- **Code Organization**: Separated HTML, CSS, and JavaScript into dedicated files for better maintainability
- **UI Enhancement**: Added "Decoded Message (Word Split)" section to display human-readable decoded output

## Future Improvements

- UI controls for beam width, temperature, and fallback penalty
- Custom text corpus upload
- Bigram visualization
- Tri-gram and multi-gram support
- Enhanced word splitting with dictionary optimization
