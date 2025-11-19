import json
import re
import collections
from operator import itemgetter
import requests
import os
from pathlib import Path

# --- CONFIGURATION ---
# How many suggestions to keep per letter. 
# Lower = Smaller file size, Higher = Better sentence variety.
TOP_K_PER_LETTER = 30

# Minimum frequency to consider a word pair valid.
# Helps remove "junk" connections that only appeared once.
MIN_BIGRAM_FREQ = 2 

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
    cache_dir = Path(".cache")
    file_name = "data.txt"
    file_path = cache_dir / file_name
    if file_path.exists():
        return file_path.read_text()
        
    url = "https://raw.githubusercontent.com/liux2/RNN-on-wikitext2/refs/heads/main/data/wiki.train.txt"
    print(f"Downloading {url}...")
    response = requests.get(url)
    text = response.text
    os.makedirs(cache_dir, exist_ok=True)
    file_path.write_text(text)
    return text

def preprocess(text):
    """
    Cleans text: lowercase, removes special chars, keeps spaces.
    """
    text = text.lower()
    # Keep only a-z and space. You might want to keep numbers if needed.
    text = re.sub(r'[^a-z\s]', '', text)
    # Collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip().split()

def build_model(tokens):
    """
    Constructs the Bigram model and vocab map.
    """
    print(f"Processing {len(tokens)} tokens...")
    
    # 1. Count individual word frequencies to build a sorted Vocab
    word_counts = collections.Counter(tokens)
    
    # Create ID mapping: 0 is reserved, words start at 1
    # Sort by frequency (most common words get smaller IDs, saves JSON bytes)
    sorted_vocab = [w for w, _ in word_counts.most_common()]
    word_to_id = {w: i for i, w in enumerate(sorted_vocab)}
    id_to_word = {i: w for i, w in enumerate(sorted_vocab)}
    
    print(f"Vocabulary size: {len(sorted_vocab)}")

    # 2. Build Bigrams: { current_word_id: { next_word_start_char: [next_word_id, freq] } }
    # Structure: transitions[current_id]['a'] = [ (next_id, count), ... ]
    transitions = collections.defaultdict(lambda: collections.defaultdict(list))
    
    # Helper to track counts before grouping
    raw_bigrams = collections.defaultdict(collections.Counter)

    for i in range(len(tokens) - 1):
        curr_w = tokens[i]
        next_w = tokens[i+1]
        
        curr_id = word_to_id[curr_w]
        next_id = word_to_id[next_w]
        
        raw_bigrams[curr_id][next_id] += 1

    # 3. Prune and Structure
    # We transform the raw counts into the efficient lookup structure
    print("Pruning and structuring data...")
    
    final_transitions = {}

    for curr_id, next_words_map in raw_bigrams.items():
        
        # Group next words by their starting character
        char_groups = collections.defaultdict(list)
        
        for next_id, count in next_words_map.items():
            if count < MIN_BIGRAM_FREQ: continue # Skip rare connections
            
            next_word_str = id_to_word[next_id]
            start_char = next_word_str[0]
            
            char_groups[start_char].append((next_id, count))
        
        # For each character group, sort by frequency and keep TOP_K
        optimized_groups = {}
        for char, candidates in char_groups.items():
            # Sort by count descending
            candidates.sort(key=itemgetter(1), reverse=True)
            # Keep only the IDs, discard counts for the final JSON (we assume sorted order implies prob)
            top_ids = [c[0] for c in candidates[:TOP_K_PER_LETTER]]
            optimized_groups[char] = top_ids
        
        if optimized_groups:
            final_transitions[str(curr_id)] = optimized_groups

    return id_to_word, final_transitions

def save_to_file(vocab, transitions, filename="model_data.json"):
    """
    Saves the compressed model.
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

# --- MAIN EXECUTION ---
if __name__ == "__main__":
    # 0. load data 
    data = load_data()

    # 1. Preprocess
    clean_tokens = preprocess(data)
    
    # 2. Build
    vocab_map, transition_graph = build_model(clean_tokens)
    
    # 3. Save
    # Note: In a real app, 'vocab' array index matches the IDs in 'map'
    # We convert the dict {0: 'word'} to a list ['word'] for JSON array efficiency
    vocab_list = [vocab_map[i] for i in range(len(vocab_map))]
    
    save_to_file(vocab_list, transition_graph)

    # --- VERIFICATION (Python Side) ---
    print("\n--- SAMPLES ---")
    print("Input ID for 'in':", vocab_list.index('in'))
    in_id = str(vocab_list.index('in'))
    if in_id in transition_graph:
        print(f"Words following 'in': {transition_graph[in_id]}")
        # Example decoding the IDs
        if 't' in transition_graph[in_id]:
            following_ids = transition_graph[in_id]['t']
            print(f" -> starting with 't': {[vocab_list[id] for id in following_ids]}")
