import { describe, it, expect } from 'vitest';
import { splitIntoWords } from './word-splitter';
import { mockModel } from '../test-fixtures';

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
