import { describe, it, expect } from 'vitest';
import { decodeText, decodeAndSplit } from './decoder';
import { splitIntoWords } from './word-splitter';
import { mockModel } from '../test-fixtures';

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
