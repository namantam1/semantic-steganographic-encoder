import { describe, it, expect } from 'vitest';
import {
  initializeBeam,
  initializeUserPath,
  performBeamStep,
  getStepCandidates,
  handleWordSelection,
  sequenceToSentence,
  validateMessage,
  BeamPath,
  UserPath,
} from './visualizer-logic';
import { Model, WordsByChar } from './encoder';

// Mock model data
const mockVocab: string[] = [
  'the',
  'a',
  'an',
  'cat',
  'dog',
  'in',
  'on',
  'house',
  'tree',
  'jumped',
  'ran',
  'slept',
];

const mockWordsByChar: WordsByChar = {
  t: [0, 8], // the, tree
  a: [1, 2], // a, an
  c: [3], // cat
  d: [4], // dog
  i: [5], // in
  o: [6], // on
  h: [7], // house
  j: [9], // jumped
  r: [10], // ran
  s: [11], // slept
};

const mockModelData: Model = {
  vocab: mockVocab,
  map: {
    '0': {
      // 'the'
      c: [3], // cat
      d: [4], // dog
      h: [7], // house
    },
    '3': {
      // 'cat'
      j: [9], // jumped
      s: [11], // slept
    },
    '4': {
      // 'dog'
      r: [10], // ran
      s: [11], // slept
    },
    '9': {
      // 'jumped'
      o: [6], // on
    },
    '6': {
      // 'on'
      t: [0, 8], // the, tree
    },
  },
};

describe('visualizer-logic', () => {
  describe('validateMessage', () => {
    it('should validate a correct message', () => {
      const result = validateMessage('hello');
      expect(result.isValid).toBe(true);
      expect(result.targetChars).toEqual(['h', 'e', 'l', 'l', 'o']);
    });

    it('should reject empty message', () => {
      const result = validateMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid message');
    });

    it('should reject message with no letters', () => {
      const result = validateMessage('123 !!!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid message');
    });

    it('should reject message longer than 20 characters', () => {
      const result = validateMessage('abcdefghijklmnopqrstuvwxyz');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should extract only letters from mixed input', () => {
      const result = validateMessage('Hello, World!');
      expect(result.isValid).toBe(true);
      expect(result.targetChars).toEqual(['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']);
    });
  });

  describe('initializeBeam', () => {
    it('should initialize beam for algorithm mode', () => {
      const targetChars = ['t', 'h', 'e'];
      const result = initializeBeam(targetChars, mockWordsByChar, 'algorithm');

      expect(result.step).toBe(1); // Algorithm mode starts at step 1
      expect(result.beam).toHaveLength(2); // 't' has 2 words: the, tree
      expect(result.beam[0].sequence).toEqual([0]); // 'the'
      expect(result.beam[1].sequence).toEqual([8]); // 'tree'
      expect(result.beam[0].score).toBe(0.0);
    });

    it('should initialize beam for manual mode', () => {
      const targetChars = ['t', 'h', 'e'];
      const result = initializeBeam(targetChars, mockWordsByChar, 'manual');

      expect(result.step).toBe(0); // Manual mode starts at step 0
      expect(result.beam).toHaveLength(2); // Same beam, but step is different
      expect(result.beam[0].sequence).toEqual([0]);
    });

    it('should handle empty target chars', () => {
      const result = initializeBeam([], mockWordsByChar, 'algorithm');
      expect(result.beam).toEqual([]);
      expect(result.step).toBe(0);
    });

    it('should handle character with no words', () => {
      const targetChars = ['z']; // No words start with 'z'
      const result = initializeBeam(targetChars, mockWordsByChar, 'algorithm');
      expect(result.beam).toEqual([]);
    });
  });

  describe('initializeUserPath', () => {
    it('should initialize user path for algorithm mode', () => {
      const algorithmBeam: BeamPath[] = [
        { sequence: [0], score: 0.0 },
        { sequence: [8], score: -0.1 },
      ];
      const result = initializeUserPath(algorithmBeam, 'algorithm');

      expect(result.sequence).toEqual([0]); // Matches first beam
      expect(result.score).toBe(0.0);
    });

    it('should initialize user path for manual mode', () => {
      const algorithmBeam: BeamPath[] = [{ sequence: [0], score: 0.0 }];
      const result = initializeUserPath(algorithmBeam, 'manual');

      expect(result.sequence).toEqual([]); // Empty in manual mode
      expect(result.score).toBe(0.0);
    });

    it('should handle empty algorithm beam', () => {
      const result = initializeUserPath([], 'algorithm');
      expect(result.sequence).toEqual([]);
      expect(result.score).toBe(0.0);
    });
  });

  describe('performBeamStep', () => {
    it('should perform one beam step correctly', () => {
      const beam: BeamPath[] = [{ sequence: [0], score: 0.0 }]; // 'the'
      const targetChars = ['t', 'c']; // Next char is 'c' (cat)
      const step = 1;

      const newBeam = performBeamStep(beam, targetChars, step, mockModelData, mockWordsByChar);

      expect(newBeam.length).toBeGreaterThan(0);
      expect(newBeam[0].sequence).toContain(0); // Should contain 'the'
      expect(newBeam[0].sequence).toContain(3); // Should contain 'cat'
    });

    it('should return unchanged beam if at end', () => {
      const beam: BeamPath[] = [{ sequence: [0, 3], score: 0.0 }];
      const targetChars = ['t', 'c'];
      const step = 2; // Past the end

      const newBeam = performBeamStep(beam, targetChars, step, mockModelData, mockWordsByChar);
      expect(newBeam).toBe(beam);
    });

    it('should handle dead end gracefully', () => {
      const beam: BeamPath[] = [{ sequence: [0], score: 0.0 }]; // 'the'
      const targetChars = ['t', 'z']; // No word 'the' -> 'z...'
      const step = 1;

      const newBeam = performBeamStep(beam, targetChars, step, mockModelData, mockWordsByChar);
      // Should return unchanged beam or handle sentence break
      expect(newBeam).toBeDefined();
    });

    it('should sort beam by score', () => {
      const beam: BeamPath[] = [
        { sequence: [0], score: -1.0 },
        { sequence: [8], score: 0.0 },
      ];
      const targetChars = ['t', 'h'];
      const step = 1;

      const newBeam = performBeamStep(beam, targetChars, step, mockModelData, mockWordsByChar);
      // Check that higher scores come first
      for (let i = 0; i < newBeam.length - 1; i++) {
        expect(newBeam[i].score).toBeGreaterThanOrEqual(newBeam[i + 1].score);
      }
    });
  });

  describe('getStepCandidates', () => {
    it('should get candidates for manual mode at step 0', () => {
      const path: UserPath = { sequence: [], score: 0.0 };
      const targetChars = ['t', 'h', 'e'];
      const step = 0;

      const candidates = getStepCandidates(
        path,
        targetChars,
        step,
        mockModelData,
        mockWordsByChar,
        'manual'
      );

      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates[0][0]).toBe(0); // First word ID for 't' is 'the'
      expect(candidates[0][1]).toBe(0.0); // First candidate has score 0.0
      expect(candidates[1][1]).toBe(-0.1); // Second candidate has score -0.1
    });

    it('should get candidates based on last word in path', () => {
      const path: UserPath = { sequence: [0], score: 0.0 }; // 'the'
      const targetChars = ['t', 'c'];
      const step = 1;

      const candidates = getStepCandidates(
        path,
        targetChars,
        step,
        mockModelData,
        mockWordsByChar,
        'manual'
      );

      expect(candidates.length).toBeGreaterThan(0);
      // Should get candidates from modelData.map['0']['c']
    });

    it('should return empty array if past end', () => {
      const path: UserPath = { sequence: [0], score: 0.0 };
      const targetChars = ['t'];
      const step = 1;

      const candidates = getStepCandidates(
        path,
        targetChars,
        step,
        mockModelData,
        mockWordsByChar,
        'manual'
      );

      expect(candidates).toEqual([]);
    });

    it('should handle empty path in manual mode', () => {
      const path: UserPath = { sequence: [], score: 0.0 };
      const targetChars = ['a'];
      const step = 0;

      const candidates = getStepCandidates(
        path,
        targetChars,
        step,
        mockModelData,
        mockWordsByChar,
        'manual'
      );

      expect(candidates.length).toBe(2); // 'a' has 2 words: a, an
    });
  });

  describe('handleWordSelection', () => {
    it('should handle normal word selection', () => {
      const userPath: UserPath = { sequence: [], score: 0.0 };
      const wordId = 0; // 'the'
      const score = 0.0;
      const currentStep = 0;

      const result = handleWordSelection(userPath, wordId, score, currentStep);

      expect(result.newPath.sequence).toEqual([0]);
      expect(result.newPath.score).toBe(0.0);
      expect(result.newStep).toBe(1); // Should advance
      expect(result.shouldAdvanceAlgorithm).toBe(true);
    });

    it('should handle sentence break selection', () => {
      const userPath: UserPath = { sequence: [0, 3], score: -0.5 };
      const wordId = -1; // SENTENCE_BREAK_ID
      const score = -0.5;
      const currentStep = 2;

      const result = handleWordSelection(userPath, wordId, score, currentStep);

      expect(result.newPath.sequence).toContain(-1);
      expect(result.newStep).toBe(2); // Should NOT advance
      expect(result.shouldAdvanceAlgorithm).toBe(false);
    });

    it('should accumulate scores correctly', () => {
      const userPath: UserPath = { sequence: [0], score: -1.0 };
      const wordId = 3;
      const score = -0.5;
      const currentStep = 1;

      const result = handleWordSelection(userPath, wordId, score, currentStep);

      expect(result.newPath.score).toBe(-1.5); // -1.0 + (-0.5)
    });
  });

  describe('sequenceToSentence', () => {
    it('should convert simple sequence to sentence', () => {
      const sequence = [0, 3]; // the, cat
      const sentence = sequenceToSentence(sequence, mockVocab);

      expect(sentence).toBe('The cat.');
    });

    it('should handle sentence breaks', () => {
      const sequence = [0, 3, -1, 0, 4]; // the, cat, BREAK, the, dog
      const sentence = sequenceToSentence(sequence, mockVocab);

      expect(sentence).toBe('The cat. The dog.');
    });

    it('should handle empty sequence', () => {
      const sentence = sequenceToSentence([], mockVocab);
      expect(sentence).toBe('');
    });

    it('should capitalize first letter of each sentence', () => {
      const sequence = [3, 9, -1, 4, 10]; // cat, jumped, BREAK, dog, ran
      const sentence = sequenceToSentence(sequence, mockVocab);

      expect(sentence).toBe('Cat jumped. Dog ran.');
    });

    it('should handle multiple consecutive breaks', () => {
      const sequence = [0, 3, -1, -1, 4, 10]; // the, cat, BREAK, BREAK, dog, ran
      const sentence = sequenceToSentence(sequence, mockVocab);

      expect(sentence).toBe('The cat. Dog ran.');
    });
  });

  describe('Integration: manual mode workflow', () => {
    it('should correctly initialize and advance through manual mode', () => {
      const targetChars = ['t', 'c', 'd'];

      // Step 1: Initialize beam
      const { beam: algorithmBeam, step: initialStep } = initializeBeam(
        targetChars,
        mockWordsByChar,
        'manual'
      );
      expect(initialStep).toBe(0); // Manual mode starts at 0

      // Step 2: Initialize user path
      const userPath = initializeUserPath(algorithmBeam, 'manual');
      expect(userPath.sequence).toEqual([]); // Empty in manual mode

      let currentUserPath = userPath;
      let currentStep = initialStep;

      // Step 3: User selects first word for 't'
      const candidates1 = getStepCandidates(
        currentUserPath,
        targetChars,
        currentStep,
        mockModelData,
        mockWordsByChar,
        'manual'
      );
      expect(candidates1.length).toBeGreaterThan(0);

      const selection1 = handleWordSelection(
        currentUserPath,
        candidates1[0][0],
        candidates1[0][1],
        currentStep
      );
      currentUserPath = selection1.newPath;
      currentStep = selection1.newStep;

      expect(currentUserPath.sequence).toEqual([0]); // 'the'
      expect(currentStep).toBe(1); // Advanced to next character

      // Step 4: User selects second word for 'c'
      const candidates2 = getStepCandidates(
        currentUserPath,
        targetChars,
        currentStep,
        mockModelData,
        mockWordsByChar,
        'manual'
      );
      expect(candidates2.length).toBeGreaterThan(0);

      const selection2 = handleWordSelection(
        currentUserPath,
        candidates2[0][0],
        candidates2[0][1],
        currentStep
      );
      currentUserPath = selection2.newPath;
      currentStep = selection2.newStep;

      expect(currentUserPath.sequence.length).toBe(2);
      expect(currentStep).toBe(2); // Advanced to next character

      // Step 5: Convert to sentence
      const sentence = sequenceToSentence(currentUserPath.sequence, mockVocab);
      expect(sentence).toBeTruthy();
      expect(sentence.charAt(0)).toBe(sentence.charAt(0).toUpperCase()); // Capitalized
    });
  });
});
