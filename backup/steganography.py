import re
import collections
import math

class SteganographyLLM:
    def __init__(self):
        self.vocab = set()
        self.word_to_id = {}
        self.id_to_word = {}
        # Structure: { current_word_id: { next_char: { next_word_id: log_prob } } }
        self.transitions = collections.defaultdict(lambda: collections.defaultdict(dict))
        # Group words by starting letter for fallback (when N-gram fails)
        self.words_by_char = collections.defaultdict(list)

    def preprocess(self, text):
        text = text.lower()
        text = re.sub(r'[^a-z\s]', '', text)
        return text.split()

    def train(self, text_corpus):
        """
        Builds the N-Gram model from text.
        """
        print("Training model...")
        tokens = self.preprocess(text_corpus)
        
        # 1. Build Vocabulary
        unique_words = sorted(list(set(tokens)))
        self.vocab = set(unique_words)
        self.word_to_id = {w: i for i, w in enumerate(unique_words)}
        self.id_to_word = {i: w for i, w in enumerate(unique_words)}
        
        for w in unique_words:
            self.words_by_char[w[0]].append(self.word_to_id[w])

        # 2. Build Transitions (Bigrams)
        # We count how often Word A -> Word B happens
        bigram_counts = collections.defaultdict(lambda: collections.defaultdict(int))
        
        for i in range(len(tokens) - 1):
            curr_id = self.word_to_id[tokens[i]]
            next_id = self.word_to_id[tokens[i+1]]
            bigram_counts[curr_id][next_id] += 1

        # 3. Convert counts to Log Probabilities
        # transitions[curr_id][char_of_next_word][next_word_id] = score
        for curr_id, next_ids in bigram_counts.items():
            total_occurrences = sum(next_ids.values())
            
            for next_id, count in next_ids.items():
                next_word = self.id_to_word[next_id]
                start_char = next_word[0]
                
                # Use Log Probability (higher is better, always negative)
                prob = math.log(count / total_occurrences)
                
                self.transitions[curr_id][start_char][next_id] = prob
        
        print(f"Training complete. Vocab size: {len(self.vocab)}")

    def get_candidates(self, current_word_id, target_char):
        """
        Returns a list of (word_id, score).
        Tries N-Gram first. If no match, falls back to raw vocabulary (Grammar break).
        """
        candidates = []
        
        # Strategy A: Look at the Graph (Coherent transition)
        if current_word_id in self.transitions:
            if target_char in self.transitions[current_word_id]:
                for next_id, score in self.transitions[current_word_id][target_char].items():
                    candidates.append((next_id, score)) # High score (e.g., -0.5)
        
        # Strategy B: Fallback (If Strategy A found nothing)
        # We add a heavy penalty to the score so Beam Search prefers Strategy A
        if not candidates:
            fallback_words = self.words_by_char.get(target_char, [])
            penalty_score = -20.0 # Arbitrary low number
            
            # Pick random subset to keep speed up if vocab is huge
            selected_fallbacks = fallback_words[:10] 
            for word_id in selected_fallbacks:
                candidates.append((word_id, penalty_score))
                
        return candidates

    def encode(self, hidden_text, beam_width=3):
        """
        Encodes text using Beam Search to find the most coherent sentence.
        """
        # Clean hidden text: "I am good" -> "iamgood"
        target_chars = [c.lower() for c in hidden_text if c.isalpha()]
        if not target_chars: return ""
        
        # Beam State: List of paths. 
        # Path = { 'sequence': [id, id], 'score': float }
        
        # Step 1: Initialize Beam with the first character
        first_char = target_chars[0]
        start_candidates = self.words_by_char.get(first_char, [])
        
        # Initial paths: [( [word_id], score )]
        beam = []
        for w_id in start_candidates:
            beam.append({
                'sequence': [w_id],
                'score': 0.0
            })
        
        # Keep top K
        beam = sorted(beam, key=lambda x: x['score'], reverse=True)[:beam_width]
        
        # Step 2: Iterate through the rest of the characters
        for char_idx, target_char in enumerate(target_chars[1:]):
            new_beam = []
            
            for path in beam:
                last_word_id = path['sequence'][-1]
                current_score = path['score']
                
                # Find valid next words starting with target_char
                candidates = self.get_candidates(last_word_id, target_char)
                
                for next_word_id, trans_score in candidates:
                    new_path = {
                        'sequence': path['sequence'] + [next_word_id],
                        'score': current_score + trans_score
                    }
                    new_beam.append(new_path)
            
            # Pruning: Sort by score and keep top K
            if not new_beam:
                print(f"Warning: Dead end at char '{target_char}'")
                break
                
            beam = sorted(new_beam, key=lambda x: x['score'], reverse=True)[:beam_width]

        # Step 3: Return best sentence
        best_path = beam[0]
        decoded_words = [self.id_to_word[i] for i in best_path['sequence']]
        
        # Capitalize first letter for style
        sentence = " ".join(decoded_words)
        return sentence.capitalize() + "."

    def decode(self, sentence):
        words = re.sub(r'[^a-zA-Z\s]', '', sentence).split()
        decoded = "".join([w[0].lower() for w in words])
        return decoded

# --- TEST DRIVER ---

# 1. Create a slightly larger mock corpus so "I am good" has connections
# This mimics what you'd get from a book.
training_data = """
In the afternoon my grandma overeats oats daily.
I am a developer and I am good at python.
Always make great options only.
My grandma is good.
Grandma overeats apples.
Oats are delicious.
Daily routines are good.
In addition my group offers options.
"""

# Initialize
model = SteganographyLLM()
model.train(training_data)

# Input
secret = "I am good"
print(f"\n--- ENCODING: '{secret}' ---")

# Run Encoder
cover_text = model.encode(secret, beam_width=5)
print(f"Output Sentence: {cover_text}")

# Run Decoder to verify
decoded_text = model.decode(cover_text)
print(f"Decoded Back:    {decoded_text}")

# Check match
clean_secret = secret.replace(" ", "").lower()
if clean_secret == decoded_text:
    print("\nSUCCESS: The message was retrieved perfectly.")
else:
    print("\nFAIL: Message mismatch.")
