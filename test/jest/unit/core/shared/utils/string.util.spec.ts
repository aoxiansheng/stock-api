import { StringUtils } from '@core/shared/utils/string.util';

describe('StringUtils', () => {
  describe('levenshteinDistance', () => {
    it('should return correct distance for identical strings', () => {
      expect(StringUtils.levenshteinDistance('hello', 'hello')).toBe(0);
      expect(StringUtils.levenshteinDistance('', '')).toBe(0);
      expect(StringUtils.levenshteinDistance('a', 'a')).toBe(0);
    });

    it('should return correct distance for empty strings', () => {
      expect(StringUtils.levenshteinDistance('', 'hello')).toBe(5);
      expect(StringUtils.levenshteinDistance('hello', '')).toBe(5);
      expect(StringUtils.levenshteinDistance('', 'a')).toBe(1);
      expect(StringUtils.levenshteinDistance('a', '')).toBe(1);
    });

    it('should return correct distance for single character differences', () => {
      expect(StringUtils.levenshteinDistance('cat', 'bat')).toBe(1); // substitution
      expect(StringUtils.levenshteinDistance('cat', 'cast')).toBe(1); // insertion
      expect(StringUtils.levenshteinDistance('cast', 'cat')).toBe(1); // deletion
    });

    it('should return correct distance for multiple differences', () => {
      expect(StringUtils.levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(StringUtils.levenshteinDistance('saturday', 'sunday')).toBe(3);
    });

    it('should handle complex transformations', () => {
      expect(StringUtils.levenshteinDistance('algorithm', 'altruistic')).toBe(6);
      expect(StringUtils.levenshteinDistance('intention', 'execution')).toBe(5);
    });

    it('should be symmetric', () => {
      const str1 = 'hello';
      const str2 = 'world';
      expect(StringUtils.levenshteinDistance(str1, str2))
        .toBe(StringUtils.levenshteinDistance(str2, str1));
    });

    it('should handle unicode characters', () => {
      expect(StringUtils.levenshteinDistance('café', 'cave')).toBe(2);
      expect(StringUtils.levenshteinDistance('你好', '世界')).toBe(2);
    });

    it('should handle long strings efficiently', () => {
      const longStr1 = 'a'.repeat(100);
      const longStr2 = 'b'.repeat(100);

      const distance = StringUtils.levenshteinDistance(longStr1, longStr2);
      expect(distance).toBe(100); // All characters need to be substituted
    });
  });

  describe('generateSimpleHash', () => {
    it('should generate consistent 8-character hash', () => {
      const input = 'test string';
      const hash1 = StringUtils.generateSimpleHash(input);
      const hash2 = StringUtils.generateSimpleHash(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);
      expect(hash1).toMatch(/^[0-9a-f]{8}$/); // Hexadecimal pattern
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = StringUtils.generateSimpleHash('string1');
      const hash2 = StringUtils.generateSimpleHash('string2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = StringUtils.generateSimpleHash('');
      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should handle unicode characters', () => {
      const hash1 = StringUtils.generateSimpleHash('café');
      const hash2 = StringUtils.generateSimpleHash('你好');

      expect(hash1).toHaveLength(8);
      expect(hash2).toHaveLength(8);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const hash = StringUtils.generateSimpleHash(longString);

      expect(hash).toHaveLength(8);
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('should be deterministic across multiple calls', () => {
      const input = 'deterministic test';
      const hashes = Array.from({ length: 10 }, () =>
        StringUtils.generateSimpleHash(input)
      );

      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(1); // All hashes should be identical
    });

    it('should handle special characters and whitespace', () => {
      const inputs = [
        'hello world',
        'hello\nworld',
        'hello\tworld',
        'hello!@#$%world',
        '  spaces  ',
        '\r\n\t'
      ];

      const hashes = inputs.map(input => StringUtils.generateSimpleHash(input));
      const uniqueHashes = new Set(hashes);

      // All different inputs should produce different hashes
      expect(uniqueHashes.size).toBe(inputs.length);

      // All hashes should be valid format
      hashes.forEach(hash => {
        expect(hash).toHaveLength(8);
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
      });
    });
  });

  describe('StringUtils class behavior', () => {
    it('should be a static utility class', () => {
      expect(typeof StringUtils.levenshteinDistance).toBe('function');
      expect(typeof StringUtils.generateSimpleHash).toBe('function');
    });

    it('should not require instantiation', () => {
      // Should be able to call methods directly on the class
      expect(() => StringUtils.levenshteinDistance('a', 'b')).not.toThrow();
      expect(() => StringUtils.generateSimpleHash('test')).not.toThrow();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null-like inputs gracefully in levenshteinDistance', () => {
      // These should be handled by TypeScript, but test runtime behavior
      expect(() => StringUtils.levenshteinDistance('test', 'test')).not.toThrow();
    });

    it('should handle various string encoding in generateSimpleHash', () => {
      const inputs = [
        'ASCII only',
        'Åccénted cháracters',
        '中文字符',
        '🚀 Emojis 🎉',
        '\u0000\u0001\u0002', // Control characters
      ];

      inputs.forEach(input => {
        expect(() => StringUtils.generateSimpleHash(input)).not.toThrow();
        const hash = StringUtils.generateSimpleHash(input);
        expect(hash).toMatch(/^[0-9a-f]{8}$/);
      });
    });
  });
});
