# Python Scripts

This directory contains Python utility scripts for building and managing the bigram model.

## Requirements

Python 3.12+ with dependencies managed by `uv`.

## Installation

```bash
cd scripts
uv sync
```

## Scripts

### `data_builder.py`

Builds the bigram model from the WikiText-2 corpus.

**Usage:**
```bash
cd scripts
python data_builder.py
```

**Configuration:**
- `TOP_K_PER_LETTER`: Number of bigram suggestions per starting letter (default: 30)
- `MIN_BIGRAM_FREQ`: Minimum frequency threshold for valid word pairs (default: 2)

**Output:**
- Generates `model_data.json` in the `../public/` directory
- Downloads and caches WikiText-2 corpus in `../.cache/`
- Model file size: ~1.4 MB

**Dependencies:**
- `datasets`: For downloading WikiText-2 corpus
- `nltk`: For text processing
- `click`: For CLI interface
- Standard library: `json`, `collections`

## Model Data Format

The generated `model_data.json` contains:

```json
{
  "vocab": ["the", "in", "afternoon", ...],
  "map": {
    "1": {
      "a": [2, 55, 90],
      "t": [0, 10]
    }
  }
}
```

- **vocab**: Array where index = Word ID
- **map**: Transition graph (current word ID → next character → list of next word IDs)
