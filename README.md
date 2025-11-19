## Steganographic Encoder Algorithm

The goal is to generate a semantically coherent "Cover Sentence" where the first letter of each word corresponds to a character in the hidden "Secret Message." The architecture is designed for a minimal footprint client-side execution.

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

This function implements the core probability-based selection with a necessary fallback:


```js
GET_CANDIDATES(current_word_id, target_char)
// Strategy 1: N-Gram Lookup (Coherent Flow)
candidates = []
transition_ids = TRANSITIONS[current_word_id][target_char]

IF transition_ids IS NOT EMPTY:
    // Assign a score based on assumed probability (first is highest)
    FOR each ID in transition_ids:
        score = BASE_SCORE - (index * 0.1) // Prefer the most frequent
        candidates.ADD(ID, score)
    
// Strategy 2: Fallback (Ensure Progress)
ELSE IF candidates IS EMPTY:
    fallback_ids = WORDS_BY_CHAR[target_char]
    
    // Apply heavy penalty (e.g., -20.0) to prioritize Strategy 1 if possible
    FOR each ID in fallback_ids (subset):
        candidates.ADD(ID, FALLBACK_PENALTY)

RETURN candidates // List of (Word ID, Score)
```

#### 2.4. Final Output

1.  Select the path with the highest overall score from the final beam.
2.  Translate the sequence of Word IDs back into words using the `VOCAB` list.
3.  Join the words to form the final cover sentence.

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

# Making it more playable

A fixed, deterministic selection (always picking the highest-scored path) quickly leads to the same encoded sentence every time, which defeats the purpose of making it hard to predict.

Temperature allows you to control the trade-off between **coherence** (low randomness) and **variety** (high randomness).

---

## 1. The Role of the Temperature Parameter ($T$)

In generative models, $T$ controls the "spikiness" of the probability distribution used for sampling the next token (word).

| Parameter Value       | Effect on Distribution                 | Encoding Output                                                                                                                                  |
| :-------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **$T \rightarrow 0$** | Sharpens the probability curve.        | Highly predictable, favoring only the highest-scored words. **Best coherence**, but **zero variety.**                                            |
| **$T = 1.0$**         | The standard probability distribution. | The likelihood of each word is respected. Good balance of coherence and variety.                                                                 |
| **$T > 1.0$**         | Flattens the probability curve.        | **Less probable** words (lower scores) have a much higher chance of being selected. High variety, but a **higher risk of generating gibberish.** |

---

## 2. Implementing Temperature in Beam Search

To incorporate temperature, the process must change from a deterministic sorting (pruning the beam) to a **Stochastic Sampling** step.

### A. Requirement: Real Scores

The simplified scoring (e.g., `score - (index * 0.1)`) is insufficient. The underlying Python model would need to export the actual **Log Probabilities** (or counts) for each bigram transition, allowing for a genuine probability distribution calculation in JavaScript. For this plan, we assume the scores used are *log probabilities* ($\text{score} = \ln(\text{probability})$).

### B. The Updated Selection Logic

Instead of simply comparing scores, the next word selection must use **Softmax** scaling and **Random Sampling**.

We will modify the core loop to apply temperature when calculating the weights for the next set of candidates:


```js
FUNCTION SELECT_NEXT_WORD_ID(current_word_id, target_char, T, beam_width):

    // 1. Get all candidates (IDs and Log Prob Scores) using the N-Gram logic
    candidates = GET_ALL_CANDIDATES(current_word_id, target_char)
    
    // 2. Prepare for Sampling (Softmax with Temperature)
    
    // Extract scores (Log Probabilities) and IDs
    scores = [c.score for c in candidates]
    
    // Apply Temperature: Divide each score by T
    temp_adjusted_scores = [score / T for score in scores]

    // Apply Softmax: Convert scores back into a normalized probability distribution (P)
    // P = exp(score/T) / SUM(exp(score_i/T))
    
    exponentiated_scores = [EXP(s) for s in temp_adjusted_scores]
    sum_exp_scores = SUM(exponentiated_scores)
    
    probabilities = [e / sum_exp_scores for e in exponentiated_scores]

    // 3. Sample
    
    // Perform N random samples (where N = beam_width) weighted by P
    sampled_next_word_ids = SAMPLE_N_FROM_CANDIDATES(probabilities, beam_width)
    
    // The new paths are created based on these randomly selected (but weighted) IDs.
    RETURN sampled_next_word_ids
```


### C. Impact on Beam Search

1.  **Coherence:** The Beam Search structure remains crucial; it ensures that even with randomness, the algorithm only pursues the *best overall sequences* (paths with the highest cumulative scores).
2.  **Variety:** By introducing the sampling step, running the encoder twice with the same input will almost certainly produce two different, yet coherent, output sentences. This dramatically improves the cryptographic quality of the encoding.


# Ideas to improve

- [ ] Add option in ui to tweak various params - beam width, temperature, fallback penalty.
- [ ] Add option to use custom text corpus.
- [ ] Add option to visualize the bigram.
- [ ] Try tri-gram and multi-gram as well.
- [ ] Better decoding by creating a reverse dictionary. 
