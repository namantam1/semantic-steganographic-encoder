# Python Scripts

This directory contains Python utility scripts for building and managing the bigram and trigram models.

## Requirements

Python 3.12+ with dependencies managed by `uv`.

## Installation

```bash
cd scripts
uv sync
```

## Scripts

### `data_builder.py`

Builds both bigram and trigram models from the WikiText-2 corpus.

**Usage:**
```bash
cd scripts
python data_builder.py
```

**Configuration:**

Bigram settings:
- `TOP_K_PER_LETTER`: Suggestions per starting letter (default: 30)
- `MIN_BIGRAM_FREQ`: Minimum frequency threshold (default: 2)

Trigram settings:
- `TOP_K_PER_LETTER_TRIGRAM`: Suggestions per starting letter (default: 20)
- `MIN_TRIGRAM_FREQ`: Minimum frequency threshold (default: 2)

**Output:**
- Generates `model_data.json` in `../public/` (~1.4 MB)
- Generates `model_data_trigram.json` in `../public/`
- Downloads and caches WikiText-2 corpus in `../.cache/`

**Dependencies:**
- `datasets`: For downloading WikiText-2 corpus
- `nltk`: For text processing
- `click`: For CLI interface
- Standard library: `json`, `collections`

## Model Data Format

**Bigram** (`model_data.json`):
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
- **map**: Bigram transitions (word1_id → next_char → [word2_ids])

**Trigram** (`model_data_trigram.json`):
```json
{
  "vocab": ["the", "in", "afternoon", ...],
  "map": {
    "1": {
      "2": {
        "a": [5, 10],
        "t": [0, 7]
      }
    }
  }
}
```
- **vocab**: Same vocabulary as bigram model
- **map**: Trigram transitions (word1_id → word2_id → next_char → [word3_ids])
