import json
import re
import collections
from operator import itemgetter
import requests
import os
from pathlib import Path
import ssl
import nltk
from nltk.corpus import words

# --- CONFIGURATION ---
# Bigram Configuration
# How many suggestions to keep per letter.
# Lower = Smaller file size, Higher = Better sentence variety.
TOP_K_PER_LETTER = 30

# Minimum frequency to consider a word pair valid.
# Helps remove "junk" connections that only appeared once.
MIN_BIGRAM_FREQ = 2

# Trigram Configuration
# How many suggestions to keep per letter for trigrams.
TOP_K_PER_LETTER_TRIGRAM = 20

# Minimum frequency to consider a word triplet valid.
MIN_TRIGRAM_FREQ = 2

# Chunk size for streaming processing (number of tokens per chunk)
# Lower = Less memory usage, Higher = Faster processing
CHUNK_SIZE = 50000 

# --- 1. MOCK CORPUS (Replace this with file loading logic for production) ---
# In a real scenario, read a large .txt file: with open('corpus.txt', 'r') as f: text = f.read()
text_corpus = """
I am good. I am a developer. I am planning to make a encoder. 
In the afternoon, my grandma overeats oats daily. 
The quick brown fox jumps over the lazy dog.
I love coding in python. Python is great for data science.
The weather is nice today. I hope it stays sunny.
In addition to this, we have other options.
"""

def load_data():
    """
    Downloads data file if not cached and returns the file path.
    Uses streaming download for memory efficiency with large files.
    """
    # Use parent directory since script is in scripts/ folder
    cache_dir = Path(".cache")
    file_name = "data_prod.txt"
    file_path = cache_dir / file_name

    if file_path.exists():
        print(f"Using cached file: {file_path}")
        return file_path

    url = "https://raw.githubusercontent.com/liux2/RNN-on-wikitext2/refs/heads/main/data/wiki.train.txt"
    print(f"Downloading {url}...")
    os.makedirs(cache_dir, exist_ok=True)

    # Stream download in chunks to avoid loading entire file in memory
    response = requests.get(url, stream=True)
    response.raise_for_status()

    with open(file_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)

    print(f"Download complete: {file_path}")
    return file_path

def load_english_words():
    """
    Downloads NLTK words corpus if needed and returns a set of valid English words.
    Converts all words to lowercase for case-insensitive matching.
    """
    try:
        # Try to load the words corpus
        english_words = set(w.lower() for w in words.words())
    except LookupError:
        # If not found, download it (handle SSL certificate issues on macOS)
        print("Downloading NLTK words corpus (one-time setup)...")
        try:
            _create_unverified_https_context = ssl._create_unverified_context
        except AttributeError:
            pass
        else:
            ssl._create_default_https_context = _create_unverified_https_context

        nltk.download('words', quiet=True)
        english_words = set(w.lower() for w in words.words())

    print(f"Loaded {len(english_words)} English words for validation")
    return english_words

def preprocess_streamed(file_path, chunk_size=CHUNK_SIZE):
    """
    Generator that yields preprocessed tokens in chunks.
    Reads file line by line for memory efficiency.

    Args:
        file_path: Path to the text file
        chunk_size: Number of tokens to accumulate before yielding

    Yields:
        List of preprocessed tokens (chunk)
    """
    buffer = []

    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            # Preprocess line: lowercase and remove non-alphabetic chars
            line = line.lower()
            line = re.sub(r'[^a-z\s]', '', line)
            line = re.sub(r'\s+', ' ', line)

            # Split into tokens
            tokens = line.strip().split()
            buffer.extend(tokens)

            # Yield chunk when buffer reaches chunk_size
            if len(buffer) >= chunk_size:
                yield buffer
                buffer = []

        # Yield remaining tokens
        if buffer:
            yield buffer

def build_model_incremental(file_path, english_words):
    """
    Constructs the Bigram model incrementally from file chunks.
    Memory-efficient approach that processes data in chunks.

    Args:
        file_path: Path to the preprocessed text file
        english_words: Set of valid English words for filtering

    Returns:
        Tuple of (id_to_word dict, final_transitions dict)
    """
    print("Building model incrementally from chunks...")

    word_counts = collections.Counter()
    raw_bigrams = collections.defaultdict(collections.Counter)
    prev_token = None
    total_tokens = 0
    valid_tokens_count = 0
    chunk_count = 0

    # Process file in chunks
    for chunk in preprocess_streamed(file_path):
        chunk_count += 1
        total_tokens += len(chunk)

        # Filter valid English words
        valid_chunk = [t for t in chunk if t in english_words]
        valid_tokens_count += len(valid_chunk)

        # Update word counts
        word_counts.update(valid_chunk)

        # Build bigrams within chunk
        for i in range(len(valid_chunk) - 1):
            curr_w = valid_chunk[i]
            next_w = valid_chunk[i + 1]
            raw_bigrams[curr_w][next_w] += 1

        # Handle cross-chunk bigram (connect last token of prev chunk to first of current)
        if prev_token and valid_chunk:
            raw_bigrams[prev_token][valid_chunk[0]] += 1

        # Remember last token for next chunk
        if valid_chunk:
            prev_token = valid_chunk[-1]

        # Progress indicator every 10 chunks
        if chunk_count % 10 == 0:
            print(f"Processed {chunk_count} chunks, {total_tokens:,} tokens, {valid_tokens_count:,} valid words...")

    print(f"\nTotal: Processed {total_tokens:,} tokens")
    print(f"Filtered to {valid_tokens_count:,} valid English words (removed {total_tokens - valid_tokens_count:,} invalid/nonsense words)")

    # Convert to ID-based structure
    sorted_vocab = [w for w, _ in word_counts.most_common()]
    word_to_id = {w: i for i, w in enumerate(sorted_vocab)}
    id_to_word = {i: w for i, w in enumerate(sorted_vocab)}

    print(f"Vocabulary size: {len(sorted_vocab)}")

    # Convert word-based bigrams to ID-based bigrams
    print("Converting bigrams to ID-based structure...")
    id_bigrams = collections.defaultdict(collections.Counter)

    for curr_w, next_counts in raw_bigrams.items():
        curr_id = word_to_id[curr_w]
        for next_w, count in next_counts.items():
            next_id = word_to_id[next_w]
            id_bigrams[curr_id][next_id] = count

    # Clear word-based bigrams to free memory
    raw_bigrams.clear()

    # Prune and structure
    print("Pruning and structuring data...")

    final_transitions = {}

    for curr_id, next_words_map in id_bigrams.items():

        # Group next words by their starting character
        char_groups = collections.defaultdict(list)

        for next_id, count in next_words_map.items():
            if count < MIN_BIGRAM_FREQ:
                continue  # Skip rare connections

            next_word_str = id_to_word[next_id]
            start_char = next_word_str[0]

            char_groups[start_char].append((next_id, count))

        # For each character group, sort by frequency and keep TOP_K
        optimized_groups = {}
        for char, candidates in char_groups.items():
            # Sort by count descending
            candidates.sort(key=itemgetter(1), reverse=True)
            # Keep only the IDs, discard counts for the final JSON
            top_ids = [c[0] for c in candidates[:TOP_K_PER_LETTER]]
            optimized_groups[char] = top_ids

        if optimized_groups:
            final_transitions[str(curr_id)] = optimized_groups

    return id_to_word, final_transitions

def build_trigram_model_incremental(file_path, english_words, word_to_id, id_to_word):
    """
    Constructs the Trigram model incrementally from file chunks.
    Memory-efficient approach that processes data in chunks.

    Args:
        file_path: Path to the preprocessed text file
        english_words: Set of valid English words for filtering
        word_to_id: Dictionary mapping words to their IDs
        id_to_word: Dictionary mapping IDs to words

    Returns:
        Dictionary of trigram transitions
    """
    print("\nBuilding trigram model incrementally from chunks...")

    raw_trigrams = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
    prev_prev_token = None
    prev_token = None
    total_tokens = 0
    valid_tokens_count = 0
    chunk_count = 0

    # Process file in chunks
    for chunk in preprocess_streamed(file_path):
        chunk_count += 1
        total_tokens += len(chunk)

        # Filter valid English words
        valid_chunk = [t for t in chunk if t in english_words]
        valid_tokens_count += len(valid_chunk)

        # Build trigrams within chunk
        for i in range(len(valid_chunk) - 2):
            word1 = valid_chunk[i]
            word2 = valid_chunk[i + 1]
            word3 = valid_chunk[i + 2]
            raw_trigrams[word1][word2][word3] += 1

        # Handle cross-chunk trigrams
        # Case 1: prev_prev and prev from previous chunk, current from this chunk
        if prev_prev_token and prev_token and valid_chunk:
            raw_trigrams[prev_prev_token][prev_token][valid_chunk[0]] += 1

        # Case 2: prev from previous chunk, first two from this chunk
        if prev_token and len(valid_chunk) >= 2:
            raw_trigrams[prev_token][valid_chunk[0]][valid_chunk[1]] += 1

        # Remember last two tokens for next chunk
        if len(valid_chunk) >= 2:
            prev_prev_token = valid_chunk[-2]
            prev_token = valid_chunk[-1]
        elif len(valid_chunk) == 1:
            prev_prev_token = prev_token
            prev_token = valid_chunk[0]

        # Progress indicator every 10 chunks
        if chunk_count % 10 == 0:
            print(f"Processed {chunk_count} chunks for trigrams, {total_tokens:,} tokens...")

    print(f"\nTrigram processing: {total_tokens:,} tokens processed")

    # Convert to ID-based structure
    print("Converting trigrams to ID-based structure...")
    id_trigrams = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))

    for word1, word2_dict in raw_trigrams.items():
        if word1 not in word_to_id:
            continue
        word1_id = word_to_id[word1]

        for word2, word3_counts in word2_dict.items():
            if word2 not in word_to_id:
                continue
            word2_id = word_to_id[word2]

            for word3, count in word3_counts.items():
                if word3 not in word_to_id:
                    continue
                word3_id = word_to_id[word3]
                id_trigrams[word1_id][word2_id][word3_id] = count

    # Clear word-based trigrams to free memory
    raw_trigrams.clear()

    # Prune and structure
    print("Pruning and structuring trigram data...")

    final_trigram_transitions = {}

    for word1_id, word2_dict in id_trigrams.items():
        word1_transitions = {}

        for word2_id, word3_counts in word2_dict.items():
            # Group next words by their starting character
            char_groups = collections.defaultdict(list)

            for word3_id, count in word3_counts.items():
                if count < MIN_TRIGRAM_FREQ:
                    continue  # Skip rare connections

                word3_str = id_to_word[word3_id]
                start_char = word3_str[0]

                char_groups[start_char].append((word3_id, count))

            # For each character group, sort by frequency and keep TOP_K
            optimized_groups = {}
            for char, candidates in char_groups.items():
                # Sort by count descending
                candidates.sort(key=itemgetter(1), reverse=True)
                # Keep only the IDs, discard counts for the final JSON
                top_ids = [c[0] for c in candidates[:TOP_K_PER_LETTER_TRIGRAM]]
                optimized_groups[char] = top_ids

            if optimized_groups:
                word1_transitions[str(word2_id)] = optimized_groups

        if word1_transitions:
            final_trigram_transitions[str(word1_id)] = word1_transitions

    print(f"Trigram model size: {len(final_trigram_transitions)} word1 contexts")

    return final_trigram_transitions

def save_to_file(vocab, transitions, filename="../public/model_data.json"):
    """
    Saves the compressed bigram model.
    """
    data = {
        "vocab": vocab, # List where index = ID
        "map": transitions # The logic graph
    }

    with open(filename, 'w') as f:
        json.dump(data, f, separators=(',', ':')) # Minimal separators to save space

    print(f"Successfully saved model to {filename}")

    # Sanity check on file size
    import os
    size_kb = os.path.getsize(filename) / 1024
    print(f"File size: {size_kb:.2f} KB")

def save_trigram_to_file(vocab, trigram_transitions, filename="../public/model_data_trigram.json"):
    """
    Saves the compressed trigram model.

    Args:
        vocab: List of words where index = ID
        trigram_transitions: Nested dict {word1_id: {word2_id: {char: [word3_ids]}}}
        filename: Output file path
    """
    data = {
        "vocab": vocab, # List where index = ID (shared with bigram)
        "map": trigram_transitions # The trigram logic graph
    }

    with open(filename, 'w') as f:
        json.dump(data, f, separators=(',', ':')) # Minimal separators to save space

    print(f"\nSuccessfully saved trigram model to {filename}")

    # Sanity check on file size
    import os
    size_kb = os.path.getsize(filename) / 1024
    print(f"File size: {size_kb:.2f} KB")

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    # 0. Load English dictionary for validation
    print("=" * 60)
    print("SEMANTIC STEGANOGRAPHIC ENCODER - Data Builder")
    print("=" * 60)
    english_words = load_english_words()

    # 1. Download/load data file (streaming download)
    file_path = load_data()

    # 2. Build bigram model incrementally with chunked processing
    print("\n" + "=" * 60)
    print("BUILDING BIGRAM MODEL")
    print("=" * 60)
    vocab_map, transition_graph = build_model_incremental(file_path, english_words)

    # 3. Convert vocab to list format
    # Note: In a real app, 'vocab' array index matches the IDs in 'map'
    # We convert the dict {0: 'word'} to a list ['word'] for JSON array efficiency
    vocab_list = [vocab_map[i] for i in range(len(vocab_map))]

    # 4. Save bigram model
    save_to_file(vocab_list, transition_graph)

    # 5. Build trigram model using the same vocabulary
    print("\n" + "=" * 60)
    print("BUILDING TRIGRAM MODEL")
    print("=" * 60)

    # Create word_to_id mapping for trigram building
    word_to_id = {w: i for i, w in enumerate(vocab_list)}

    trigram_graph = build_trigram_model_incremental(
        file_path,
        english_words,
        word_to_id,
        vocab_map
    )

    # 6. Save trigram model
    save_trigram_to_file(vocab_list, trigram_graph)

    # --- VERIFICATION (Python Side) ---
    print("\n" + "=" * 60)
    print("VERIFICATION SAMPLES")
    print("=" * 60)

    # Bigram verification
    print("\n--- BIGRAM SAMPLE ---")
    print("Input ID for 'in':", vocab_list.index('in'))
    in_id = str(vocab_list.index('in'))
    if in_id in transition_graph:
        print(f"Words following 'in': {transition_graph[in_id]}")
        # Example decoding the IDs
        if 't' in transition_graph[in_id]:
            following_ids = transition_graph[in_id]['t']
            print(f" -> starting with 't': {[vocab_list[id] for id in following_ids]}")

    # Trigram verification
    print("\n--- TRIGRAM SAMPLE ---")
    if in_id in trigram_graph:
        print(f"Trigram contexts starting with 'in' ({in_id}): {list(trigram_graph[in_id].keys())[:5]}...")
        # Get first available second word
        if trigram_graph[in_id]:
            second_word_id = list(trigram_graph[in_id].keys())[0]
            second_word = vocab_list[int(second_word_id)]
            print(f"Example: 'in' -> '{second_word}' transitions: {trigram_graph[in_id][second_word_id]}")
    else:
        print(f"No trigram contexts found starting with 'in'")
