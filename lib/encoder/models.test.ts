import { describe, it, expect } from 'vitest';
import { getTargetChars, getCandidates } from './models';
import { mockModel, mockWordsByChar } from '../test-fixtures';

const SENTENCE_BREAK_ID = -1;

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
    const candidates = getCandidates(mockModel, null, mockWordsByChar, [0], 'i');
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toEqual([1, 0.0]); // 'in' with base score
    expect(candidates[1]).toEqual([4, -0.1]); // 'is' with penalty
  });

  it('should return SENTENCE_BREAK_ID when no bigram transition exists', () => {
    const candidates = getCandidates(mockModel, null, mockWordsByChar, [9], 'x'); // 'night' -> 'x' (no transition)
    expect(candidates).toHaveLength(1);
    expect(candidates[0][0]).toBe(SENTENCE_BREAK_ID);
    expect(candidates[0][1]).toBe(-0.5); // Small penalty for sentence break
  });

  it('should return SENTENCE_BREAK_ID when no words exist for character', () => {
    const candidates = getCandidates(mockModel, null, mockWordsByChar, [5], 'z'); // No 'z' words
    expect(candidates).toHaveLength(1);
    expect(candidates[0][0]).toBe(SENTENCE_BREAK_ID);
  });

  it('should handle sentence start (after SENTENCE_BREAK_ID)', () => {
    const candidates = getCandidates(mockModel, null, mockWordsByChar, [SENTENCE_BREAK_ID], 't');
    expect(candidates.length).toBeGreaterThan(0);
    // Should return actual word IDs, not another sentence break
    expect(candidates[0][0]).not.toBe(SENTENCE_BREAK_ID);
    expect(candidates[0][0]).toBeGreaterThanOrEqual(0);
  });

  it('should assign descending scores for bigram candidates', () => {
    const candidates = getCandidates(mockModel, null, mockWordsByChar, [0], 'a');
    expect(candidates[0][1]).toBe(0.0);
    expect(candidates[1][1]).toBe(-0.1);
    expect(candidates[2][1]).toBe(-0.2);
  });

  it('should handle new sentence start with proper scoring', () => {
    const candidates = getCandidates(mockModel, null, mockWordsByChar, [SENTENCE_BREAK_ID], 'i');
    expect(candidates.length).toBeGreaterThan(0);
    // First candidate should have base score
    expect(candidates[0][1]).toBe(0.0);
    // Second candidate should have descending score
    if (candidates.length > 1) {
      expect(candidates[1][1]).toBe(-0.1);
    }
  });
});
