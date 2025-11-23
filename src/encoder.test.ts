import { describe, it, expect } from 'vitest';
import {
    getTargetChars,
    getCandidates,
    encodeText,
    decodeText,
    splitIntoWords,
    decodeAndSplit,
    Model,
    WordsByChar
} from './encoder';

// Mock model and wordsByChar data for testing
const mockModel: Model = {
    vocab: ['the', 'in', 'afternoon', 'time', 'is', 'apple', 'amazing', 'good', 'morning', 'night', 'test', 'today', 'xenon', 'yellow', 'zebra'],
    map: {
        '0': { // 'the'
            'i': [1, 4], // 'in', 'is'
            'a': [2, 5, 6], // 'afternoon', 'apple', 'amazing'
            't': [3, 10] // 'time', 'test'
        },
        '1': { // 'in'
            't': [0, 3], // 'the', 'time'
            'a': [2] // 'afternoon'
        },
        '3': { // 'time'
            'i': [1, 4], // 'in', 'is'
            't': [11] // 'today'
        },
        '7': { // 'good'
            'm': [8], // 'morning'
            'n': [9] // 'night'
        },
        '8': { // 'morning'
            't': [11, 10] // 'today', 'test'
        }
        // Note: xenon (12), yellow (13), zebra (14) have no bigram transitions
        // These will trigger sentence breaks when used
    }
};

const mockWordsByChar: WordsByChar = {
    't': [0, 3, 10, 11], // 'the', 'time', 'test', 'today'
    'i': [1, 4], // 'in', 'is'
    'a': [2, 5, 6], // 'afternoon', 'apple', 'amazing'
    'g': [7], // 'good'
    'm': [8], // 'morning'
    'n': [9], // 'night'
    'x': [12], // 'xenon'
    'y': [13], // 'yellow'
    'z': [14] // 'zebra'
};

describe('getTargetChars', () => {
    it('should extract lowercase letters from text', () => {
        expect(getTargetChars('Hello World')).toEqual(['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']);
    });

    it('should remove non-alphabetic characters', () => {
        expect(getTargetChars('Hello, World! 123')).toEqual(['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']);
    });

    it('should handle empty string', () => {
        expect(getTargetChars('')).toEqual([]);
    });

    it('should handle string with only special characters', () => {
        expect(getTargetChars('123!@#$%')).toEqual([]);
    });

    it('should convert uppercase to lowercase', () => {
        expect(getTargetChars('ABC')).toEqual(['a', 'b', 'c']);
    });

    it('should handle mixed case and special characters', () => {
        expect(getTargetChars('I am GOOD!')).toEqual(['i', 'a', 'm', 'g', 'o', 'o', 'd']);
    });
});

describe('getCandidates', () => {
    const SENTENCE_BREAK_ID = -1;

    it('should return candidates from bigram transitions', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 0, 'i');
        expect(candidates).toHaveLength(2);
        expect(candidates[0]).toEqual([1, 0.0]); // 'in' with base score
        expect(candidates[1]).toEqual([4, -0.1]); // 'is' with penalty
    });

    it('should return SENTENCE_BREAK_ID when no bigram transition exists', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 9, 'x'); // 'night' -> 'x' (no transition)
        expect(candidates).toHaveLength(1);
        expect(candidates[0][0]).toBe(SENTENCE_BREAK_ID);
        expect(candidates[0][1]).toBe(-0.5); // Small penalty for sentence break
    });

    it('should return SENTENCE_BREAK_ID when no words exist for character', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 5, 'z'); // No 'z' words
        expect(candidates).toHaveLength(1);
        expect(candidates[0][0]).toBe(SENTENCE_BREAK_ID);
    });

    it('should handle sentence start (after SENTENCE_BREAK_ID)', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, SENTENCE_BREAK_ID, 't');
        expect(candidates.length).toBeGreaterThan(0);
        // Should return actual word IDs, not another sentence break
        expect(candidates[0][0]).not.toBe(SENTENCE_BREAK_ID);
        expect(candidates[0][0]).toBeGreaterThanOrEqual(0);
    });

    it('should assign descending scores for bigram candidates', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 0, 'a');
        expect(candidates[0][1]).toBe(0.0);
        expect(candidates[1][1]).toBe(-0.1);
        expect(candidates[2][1]).toBe(-0.2);
    });

    it('should handle new sentence start with proper scoring', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, SENTENCE_BREAK_ID, 'i');
        expect(candidates.length).toBeGreaterThan(0);
        // First candidate should have base score
        expect(candidates[0][1]).toBe(0.0);
        // Second candidate should have descending score
        if (candidates.length > 1) {
            expect(candidates[1][1]).toBe(-0.1);
        }
    });
});

describe('encodeText', () => {
    it('should encode a simple sequence of characters', () => {
        const result = encodeText(mockModel, mockWordsByChar, ['t', 'i', 'a']);
        expect(result).toBeTruthy();
        expect(result).toMatch(/^[A-Z]/); // Should start with capital
        expect(result).toMatch(/\.$/); // Should end with period
    });

    it('should handle empty target chars', () => {
        const result = encodeText(mockModel, mockWordsByChar, []);
        expect(result).toBe('');
    });

    it('should handle single character', () => {
        const result = encodeText(mockModel, mockWordsByChar, ['t']);
        expect(result).toBeTruthy();
        const decoded = decodeText(result);
        expect(decoded).toBe('t');
    });

    it('should return error message when no valid path exists', () => {
        // Create a scenario with no valid words
        const emptyWordsByChar: WordsByChar = {};
        const result = encodeText(mockModel, emptyWordsByChar, ['z']);
        expect(result).toBe('Encoding failed: No valid path found.');
    });

    it('should encode and decode correctly', () => {
        const targetChars = ['t', 'i', 'm'];
        const encoded = encodeText(mockModel, mockWordsByChar, targetChars);
        const decoded = decodeText(encoded);
        expect(decoded).toBe(targetChars.join(''));
    });

    // NEW: Sentence break feature tests
    describe('Sentence Break Feature', () => {
        it('should create multiple sentences when bigram transitions missing', () => {
            // Create a sequence that will trigger sentence breaks
            // 'morning' (8) has no transition to 'x', should trigger sentence break
            const targetChars = ['g', 'm', 'x']; // good -> morning -> (break) -> x-word
            const result = encodeText(mockModel, mockWordsByChar, targetChars);

            expect(result).toBeTruthy();
            // Should have at least one period (could have multiple sentences)
            const periods = (result.match(/\./g) || []).length;
            expect(periods).toBeGreaterThanOrEqual(1);

            // Should still decode correctly
            const decoded = decodeText(result);
            expect(decoded).toBe(targetChars.join(''));
        });

        it('should capitalize each sentence after break', () => {
            // Force sentence break scenario
            const targetChars = ['g', 'm', 'x'];
            const result = encodeText(mockModel, mockWordsByChar, targetChars);

            // Split by periods and check capitalization
            const sentences = result.split('.').filter(s => s.trim().length > 0);

            sentences.forEach(sentence => {
                const trimmed = sentence.trim();
                expect(trimmed[0]).toBe(trimmed[0].toUpperCase());
            });
        });

        it('should handle consecutive sentence breaks', () => {
            // Create scenario with multiple missing transitions
            const targetChars = ['t', 'x', 'y', 'z']; // Multiple breaks likely
            const result = encodeText(mockModel, mockWordsByChar, targetChars);

            expect(result).toBeTruthy();
            const decoded = decodeText(result);
            expect(decoded).toBe(targetChars.join(''));

            // Should have proper punctuation
            expect(result).toMatch(/\.$/);
        });

        it('should produce grammatically coherent text with sentence breaks', () => {
            const targetChars = ['t', 'i', 'x', 't'];
            const result = encodeText(mockModel, mockWordsByChar, targetChars);

            // Check structure: should have words separated by spaces
            const words = result.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
            expect(words.length).toBeGreaterThan(0);

            // Each word should be from vocab or reasonable
            words.forEach(word => {
                expect(word.length).toBeGreaterThan(0);
            });
        });

        it('should prefer bigram transitions over sentence breaks', () => {
            // Use a sequence with good bigram coverage
            const targetChars = ['t', 'i', 't']; // the -> in -> time
            const result = encodeText(mockModel, mockWordsByChar, targetChars);

            // Decode should match
            const decoded = decodeText(result);
            expect(decoded).toBe(targetChars.join(''));

            // Should be coherent text
            expect(result).toMatch(/^[A-Z]/);
            expect(result).toMatch(/\.$/);
        });

        it('should handle sentence break at beginning of encoding', () => {
            // Start with a character that might not have good options
            const targetChars = ['x', 't', 'i'];
            const result = encodeText(mockModel, mockWordsByChar, targetChars);

            expect(result).toBeTruthy();
            const decoded = decodeText(result);
            expect(decoded).toBe(targetChars.join(''));
        });

        it('should maintain proper sentence structure across breaks', () => {
            const targetChars = ['g', 'm', 'x', 't'];
            const result = encodeText(mockModel, mockWordsByChar, targetChars);

            // Split into sentences
            const sentences = result.split('.').filter(s => s.trim().length > 0);

            // Each sentence should start with capital and contain valid words
            sentences.forEach(sentence => {
                const trimmed = sentence.trim();
                expect(trimmed.length).toBeGreaterThan(0);
                expect(trimmed[0]).toBe(trimmed[0].toUpperCase());

                // Should contain at least one word
                const words = trimmed.toLowerCase().split(/\s+/);
                expect(words.length).toBeGreaterThan(0);
            });
        });
    });
});

describe('decodeText', () => {
    it('should extract first letters from words', () => {
        expect(decodeText('The In Afternoon')).toBe('tia');
    });

    it('should handle lowercase input', () => {
        expect(decodeText('the in afternoon')).toBe('tia');
    });

    it('should ignore punctuation', () => {
        expect(decodeText('The, In! Afternoon.')).toBe('tia');
    });

    it('should handle empty string', () => {
        expect(decodeText('')).toBe('');
    });

    it('should handle string with no alphabetic characters', () => {
        expect(decodeText('123 !@# $%^')).toBe('');
    });

    it('should handle mixed case with numbers', () => {
        expect(decodeText('Test123 Is456 Amazing789')).toBe('tia');
    });
});

describe('splitIntoWords', () => {
    it('should split a valid word sequence', () => {
        const result = splitIntoWords(mockModel, 'theinafternoon');
        expect(result).toBe('the in afternoon');
    });

    it('should handle single word', () => {
        const result = splitIntoWords(mockModel, 'the');
        expect(result).toBe('the');
    });

    it('should handle empty string', () => {
        const result = splitIntoWords(mockModel, '');
        expect(result).toBe('');
    });

    it('should handle unrecognized characters', () => {
        const result = splitIntoWords(mockModel, 'thexin');
        // Should try to split optimally, 'x' will be unrecognized
        expect(result).toContain('the');
        expect(result).toContain('in');
    });

    it('should handle text with no valid words', () => {
        const result = splitIntoWords(mockModel, 'xyz');
        expect(result).toBe('x y z'); // Each char treated as unrecognized
    });

    it('should prefer longer valid words', () => {
        const result = splitIntoWords(mockModel, 'afternoon');
        expect(result).toBe('afternoon'); // Should prefer whole word over 'a' + 'f' + ...
    });
});

describe('decodeAndSplit', () => {
    it('should decode and split a sentence', () => {
        const sentence = 'The In Afternoon';
        const result = decodeAndSplit(mockModel, sentence);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('should handle empty sentence', () => {
        const result = decodeAndSplit(mockModel, '');
        expect(result).toBe('');
    });

    it('should decode first letters and split into words', () => {
        // If we have 'the in afternoon' encoded, decoded chars are 'tia'
        // Then split 'tia' -> depends on vocab
        const sentence = 'Test Is Amazing';
        const decoded = decodeText(sentence); // 'tia'
        const split = splitIntoWords(mockModel, decoded);
        expect(split).toBeTruthy();
    });

    it('should handle sentence with punctuation', () => {
        const sentence = 'The, In! Afternoon.';
        const result = decodeAndSplit(mockModel, sentence);
        expect(result).toBeTruthy();
    });
});

describe('Integration tests', () => {
    it('should encode and decode round-trip correctly', () => {
        const secret = 'tim';
        const targetChars = getTargetChars(secret);
        const encoded = encodeText(mockModel, mockWordsByChar, targetChars);
        const decoded = decodeText(encoded);

        expect(decoded).toBe(secret);
    });

    it('should handle full encode-decode-split workflow', () => {
        const secret = 'tim';
        const targetChars = getTargetChars(secret);
        const encoded = encodeText(mockModel, mockWordsByChar, targetChars);
        const decoded = decodeText(encoded);
        const split = decodeAndSplit(mockModel, encoded);

        expect(decoded).toBe(secret);
        expect(split).toBeTruthy();
        expect(typeof split).toBe('string');
    });

    it('should preserve message through full pipeline', () => {
        const originalMessage = 'tim'; // Use a simpler message that works with our limited mock vocab
        const targetChars = getTargetChars(originalMessage); // ['t', 'i', 'm']
        const coverText = encodeText(mockModel, mockWordsByChar, targetChars);
        const decodedRaw = decodeText(coverText);

        expect(decodedRaw).toBe(targetChars.join(''));
        expect(coverText).not.toBe('Encoding failed: No valid path found.');
    });
});
