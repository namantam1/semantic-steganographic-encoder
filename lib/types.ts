// Type definitions
export interface BigramModel {
  vocab: string[];
  map: {
    [wordId: string]: {
      [char: string]: number[];
    };
  };
}

export interface TrigramModel {
  vocab: string[];
  map: {
    [word1Id: string]: {
      [word2Id: string]: {
        [char: string]: number[];
      };
    };
  };
}

export type Model = BigramModel | TrigramModel;

export interface WordsByChar {
  [char: string]: number[];
}

export interface BeamPath {
  sequence: number[];
  score: number;
}

export enum ModelType {
  BIGRAM = 'bigram',
  TRIGRAM = 'trigram',
}

export enum FallbackStrategy {
  SENTENCE_BREAK = 'sentence_break',
  BIGRAM_FALLBACK = 'bigram_fallback',
  BIGRAM_THEN_BREAK = 'bigram_then_break',
}
