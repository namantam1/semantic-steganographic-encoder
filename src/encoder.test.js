import { describe, it, expect } from 'vitest';
import {
    getTargetChars,
    getCandidates,
    encodeText,
    decodeText,
    splitIntoWords,
    decodeAndSplit
} from './encoder.js';

// Mock model and wordsByChar data for testing
const mockModel = {
    vocab: ['the', 'in', 'afternoon', 'time', 'is', 'apple', 'amazing', 'good', 'morning', 'night', 'test', 'today'],
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
    }
};

const mockWordsByChar = {
    't': [0, 3, 10, 11], // 'the', 'time', 'test', 'today'
    'i': [1, 4], // 'in', 'is'
    'a': [2, 5, 6], // 'afternoon', 'apple', 'amazing'
    'g': [7], // 'good'
    'm': [8], // 'morning'
    'n': [9] // 'night'
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
    it('should return candidates from bigram transitions', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 0, 'i');
        expect(candidates).toHaveLength(2);
        expect(candidates[0]).toEqual([1, 0.0]); // 'in' with base score
        expect(candidates[1]).toEqual([4, -0.1]); // 'is' with penalty
    });

    it('should fallback to wordsByChar when no bigram transition exists', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 5, 'z'); // No 'z' words
        expect(candidates).toEqual([]);
    });

    it('should use fallback when current word has no transitions', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 9, 't'); // 'night' -> 't' (no transition in map)
        expect(candidates.length).toBeLessThanOrEqual(5);
        // Should have penalty score
        expect(candidates[0][1]).toBe(-20.0);
    });

    it('should limit fallback candidates to 5', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 9, 't');
        expect(candidates.length).toBeLessThanOrEqual(5);
    });

    it('should assign descending scores for bigram candidates', () => {
        const candidates = getCandidates(mockModel, mockWordsByChar, 0, 'a');
        expect(candidates[0][1]).toBe(0.0);
        expect(candidates[1][1]).toBe(-0.1);
        expect(candidates[2][1]).toBe(-0.2);
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
        const emptyWordsByChar = {};
        const result = encodeText(mockModel, emptyWordsByChar, ['z']);
        expect(result).toBe('Encoding failed: No valid path found.');
    });

    it('should encode and decode correctly', () => {
        const targetChars = ['t', 'i', 'm'];
        const encoded = encodeText(mockModel, mockWordsByChar, targetChars);
        const decoded = decodeText(encoded);
        expect(decoded).toBe(targetChars.join(''));
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
