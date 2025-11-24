import type { BigramModel, WordsByChar } from './types';

// Mock model and wordsByChar data for testing
export const mockModel: BigramModel = {
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

export const mockWordsByChar: WordsByChar = {
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
