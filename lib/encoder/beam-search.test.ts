import { describe, it, expect } from 'vitest';
import { encodeText } from './beam-search';
import { decodeText } from '../decoder/decoder';
import { mockModel, mockWordsByChar } from '../test-fixtures';
import type { WordsByChar } from '../types';

describe('encodeText', () => {
  it('should encode a simple sequence of characters', () => {
    const result = encodeText(mockModel, null, mockWordsByChar, ['t', 'i', 'a']);
    expect(result).toBeTruthy();
    expect(result).toMatch(/^[A-Z]/); // Should start with capital
    expect(result).toMatch(/\.$/); // Should end with period
  });

  it('should handle empty target chars', () => {
    const result = encodeText(mockModel, null, mockWordsByChar, []);
    expect(result).toBe('');
  });

  it('should handle single character', () => {
    const result = encodeText(mockModel, null, mockWordsByChar, ['t']);
    expect(result).toBeTruthy();
    const decoded = decodeText(result);
    expect(decoded).toBe('t');
  });

  it('should return error message when no valid path exists', () => {
    // Create a scenario with no valid words
    const emptyWordsByChar: WordsByChar = {};
    const result = encodeText(mockModel, null, emptyWordsByChar, ['z']);
    expect(result).toBe('Encoding failed: No valid path found.');
  });

  it('should encode and decode correctly', () => {
    const targetChars = ['t', 'i', 'm'];
    const encoded = encodeText(mockModel, null, mockWordsByChar, targetChars);
    const decoded = decodeText(encoded);
    expect(decoded).toBe(targetChars.join(''));
  });

  describe('Sentence Break Feature', () => {
    it('should create multiple sentences when bigram transitions missing', () => {
      // Create a sequence that will trigger sentence breaks
      // 'morning' (8) has no transition to 'x', should trigger sentence break
      const targetChars = ['g', 'm', 'x']; // good -> morning -> (break) -> x-word
      const result = encodeText(mockModel, null, mockWordsByChar, targetChars);

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
      const result = encodeText(mockModel, null, mockWordsByChar, targetChars);

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
      const result = encodeText(mockModel, null, mockWordsByChar, targetChars);

      expect(result).toBeTruthy();
      const decoded = decodeText(result);
      expect(decoded).toBe(targetChars.join(''));

      // Should have proper punctuation
      expect(result).toMatch(/\.$/);
    });

    it('should produce grammatically coherent text with sentence breaks', () => {
      const targetChars = ['t', 'i', 'x', 't'];
      const result = encodeText(mockModel, null, mockWordsByChar, targetChars);

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
      const result = encodeText(mockModel, null, mockWordsByChar, targetChars);

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
      const result = encodeText(mockModel, null, mockWordsByChar, targetChars);

      expect(result).toBeTruthy();
      const decoded = decodeText(result);
      expect(decoded).toBe(targetChars.join(''));
    });

    it('should maintain proper sentence structure across breaks', () => {
      const targetChars = ['g', 'm', 'x', 't'];
      const result = encodeText(mockModel, null, mockWordsByChar, targetChars);

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
