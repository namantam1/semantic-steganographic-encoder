import { describe, it, expect } from 'vitest';
import { getTargetChars } from './encoder/models';
import { encodeText } from './encoder/beam-search';
import { decodeText, decodeAndSplit } from './decoder/decoder';
import { mockModel, mockWordsByChar } from './test-fixtures';

describe('Integration tests', () => {
  it('should encode and decode round-trip correctly', () => {
    const secret = 'tim';
    const targetChars = getTargetChars(secret);
    const encoded = encodeText(mockModel, null, mockWordsByChar, targetChars);
    const decoded = decodeText(encoded);

    expect(decoded).toBe(secret);
  });

  it('should handle full encode-decode-split workflow', () => {
    const secret = 'tim';
    const targetChars = getTargetChars(secret);
    const encoded = encodeText(mockModel, null, mockWordsByChar, targetChars);
    const decoded = decodeText(encoded);
    const split = decodeAndSplit(mockModel, encoded);

    expect(decoded).toBe(secret);
    expect(split).toBeTruthy();
    expect(typeof split).toBe('string');
  });

  it('should preserve message through full pipeline', () => {
    const originalMessage = 'tim'; // Use a simpler message that works with our limited mock vocab
    const targetChars = getTargetChars(originalMessage); // ['t', 'i', 'm']
    const coverText = encodeText(mockModel, null, mockWordsByChar, targetChars);
    const decodedRaw = decodeText(coverText);

    expect(decodedRaw).toBe(targetChars.join(''));
    expect(coverText).not.toBe('Encoding failed: No valid path found.');
  });
});
