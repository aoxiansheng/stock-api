import {
  StringValidationUtil,
  StringValidationConfig,
  StringGenerationConfig,
  ValidationResult,
} from '@common/utils/string-validation.util';

describe('StringValidationUtil', () => {
  describe('Constants and Presets', () => {
    it('should have correct default charset', () => {
      expect(StringValidationUtil.DEFAULT_CHARSET).toBe(
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      );
    });

    it('should have all charset presets', () => {
      expect(StringValidationUtil.CHARSET_PRESETS.ALPHANUMERIC).toBe(
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      );
      expect(StringValidationUtil.CHARSET_PRESETS.ALPHA_ONLY).toBe(
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      );
      expect(StringValidationUtil.CHARSET_PRESETS.NUMERIC_ONLY).toBe('0123456789');
      expect(StringValidationUtil.CHARSET_PRESETS.LOWERCASE).toBe(
        'abcdefghijklmnopqrstuvwxyz',
      );
      expect(StringValidationUtil.CHARSET_PRESETS.UPPERCASE).toBe(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      );
      expect(StringValidationUtil.CHARSET_PRESETS.HEX).toBe('0123456789abcdef');
      expect(StringValidationUtil.CHARSET_PRESETS.HEX_UPPER).toBe('0123456789ABCDEF');
      expect(StringValidationUtil.CHARSET_PRESETS.BASE64_SAFE).toBe(
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
      );
    });
  });

  describe('isNullish', () => {
    it('should identify null and undefined values', () => {
      expect(StringValidationUtil.isNullish(null)).toBe(true);
      expect(StringValidationUtil.isNullish(undefined)).toBe(true);
      expect(StringValidationUtil.isNullish('')).toBe(false);
      expect(StringValidationUtil.isNullish(0)).toBe(false);
      expect(StringValidationUtil.isNullish(false)).toBe(false);
      expect(StringValidationUtil.isNullish('test')).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('should identify empty strings', () => {
      expect(StringValidationUtil.isEmpty('')).toBe(true);
      expect(StringValidationUtil.isEmpty('   ')).toBe(true);
      expect(StringValidationUtil.isEmpty('\t\n')).toBe(true);
    });

    it('should identify non-empty strings', () => {
      expect(StringValidationUtil.isEmpty('test')).toBe(false);
      expect(StringValidationUtil.isEmpty(' test ')).toBe(false);
      expect(StringValidationUtil.isEmpty('0')).toBe(false);
    });

    it('should handle trimFirst parameter', () => {
      expect(StringValidationUtil.isEmpty('   ', true)).toBe(true);
      expect(StringValidationUtil.isEmpty('   ', false)).toBe(false);
    });

    it('should handle nullish values', () => {
      // @ts-ignore
      expect(StringValidationUtil.isEmpty(null)).toBe(true);
      // @ts-ignore
      expect(StringValidationUtil.isEmpty(undefined)).toBe(true);
    });
  });

  describe('validateString', () => {
    it('should validate basic string requirements', () => {
      const result = StringValidationUtil.validateString('valid string');
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject null/undefined when not allowed', () => {
      const result1 = StringValidationUtil.validateString(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Value cannot be null or undefined');

      const result2 = StringValidationUtil.validateString(undefined);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Value cannot be null or undefined');
    });

    it('should allow null/undefined when configured', () => {
      const config: StringValidationConfig = { allowNullish: true };
      const result1 = StringValidationUtil.validateString(null, config);
      expect(result1.isValid).toBe(true);

      const result2 = StringValidationUtil.validateString(undefined, config);
      expect(result2.isValid).toBe(true);
    });

    it('should reject non-string values', () => {
      const result1 = StringValidationUtil.validateString(123);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Value must be a string');

      const result2 = StringValidationUtil.validateString(true);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Value must be a string');
    });

    it('should validate minimum length', () => {
      const config: StringValidationConfig = { minLength: 5 };
      const result = StringValidationUtil.validateString('test', config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at least 5 characters long');
    });

    it('should validate maximum length', () => {
      const config: StringValidationConfig = { maxLength: 3 };
      const result = StringValidationUtil.validateString('testing', config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be at most 3 characters long');
    });

    it('should validate pattern matching', () => {
      const config: StringValidationConfig = { pattern: /^[0-9]+$/ };

      const result1 = StringValidationUtil.validateString('123', config);
      expect(result1.isValid).toBe(true);

      const result2 = StringValidationUtil.validateString('abc', config);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Value does not match required pattern');
    });

    it('should handle empty strings based on allowEmpty config', () => {
      const config1: StringValidationConfig = { allowEmpty: false };
      const result1 = StringValidationUtil.validateString('', config1);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Value cannot be empty');

      const config2: StringValidationConfig = { allowEmpty: true };
      const result2 = StringValidationUtil.validateString('', config2);
      expect(result2.isValid).toBe(true);
    });

    it('should handle multiple validation errors', () => {
      const config: StringValidationConfig = {
        minLength: 10,
        maxLength: 5,
        pattern: /^[0-9]+$/,
      };
      const result = StringValidationUtil.validateString('abc', config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('isValidName', () => {
    it('should validate valid names', () => {
      expect(StringValidationUtil.isValidName('john_doe')).toBe(true);
      expect(StringValidationUtil.isValidName('Test Name')).toBe(true);
      expect(StringValidationUtil.isValidName('user-123')).toBe(true);
      expect(StringValidationUtil.isValidName('file.txt')).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(StringValidationUtil.isValidName('')).toBe(false);
      expect(StringValidationUtil.isValidName('name@domain')).toBe(false);
      expect(StringValidationUtil.isValidName('name#hash')).toBe(false);
    });

    it('should accept custom configuration', () => {
      const config: StringValidationConfig = {
        minLength: 5,
        pattern: /^[a-z]+$/,
      };
      expect(StringValidationUtil.isValidName('hello', config)).toBe(true);
      expect(StringValidationUtil.isValidName('hi', config)).toBe(false);
      expect(StringValidationUtil.isValidName('Hello', config)).toBe(false);
    });
  });

  describe('matchesPattern', () => {
    it('should match valid patterns', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(StringValidationUtil.matchesPattern('test@example.com', emailPattern)).toBe(true);
      expect(StringValidationUtil.matchesPattern('invalid-email', emailPattern)).toBe(false);
    });

    it('should handle edge cases', () => {
      const pattern = /^test$/;
      // @ts-ignore
      expect(StringValidationUtil.matchesPattern(null, pattern)).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.matchesPattern(undefined, pattern)).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.matchesPattern(123, pattern)).toBe(false);
    });
  });

  describe('generateRandomString', () => {
    it('should generate string with correct length', () => {
      const config: StringGenerationConfig = { length: 10 };
      const result = StringValidationUtil.generateRandomString(config);
      expect(result.length).toBe(10);
    });

    it('should use specified charset', () => {
      const config: StringGenerationConfig = {
        length: 100,
        charset: '01',
      };
      const result = StringValidationUtil.generateRandomString(config);
      expect(result).toMatch(/^[01]+$/);
    });

    it('should add prefix and suffix', () => {
      const config: StringGenerationConfig = {
        length: 5,
        prefix: 'PRE_',
        suffix: '_SUF',
      };
      const result = StringValidationUtil.generateRandomString(config);
      expect(result).toMatch(/^PRE_.{5}_SUF$/);
    });

    it('should handle zero length', () => {
      const config: StringGenerationConfig = { length: 0 };
      const result = StringValidationUtil.generateRandomString(config);
      expect(result).toBe('');
    });

    it('should throw error for negative length', () => {
      const config: StringGenerationConfig = { length: -1 };
      expect(() => StringValidationUtil.generateRandomString(config)).toThrow(
        'Length must be non-negative',
      );
    });

    it('should throw error for empty charset', () => {
      const config: StringGenerationConfig = { length: 5, charset: '' };
      expect(() => StringValidationUtil.generateRandomString(config)).toThrow(
        'Charset cannot be empty',
      );
    });
  });

  describe('sanitizeString', () => {
    it('should mask strings correctly', () => {
      const result = StringValidationUtil.sanitizeString('1234567890123456');
      expect(result).toBe('1234********3456');
    });

    it('should handle short strings', () => {
      const result = StringValidationUtil.sanitizeString('123');
      expect(result).toBe('***');
    });

    it('should use custom parameters', () => {
      const result = StringValidationUtil.sanitizeString('1234567890', 2, 2, '#');
      expect(result).toBe('12######90');
    });

    it('should handle edge cases', () => {
      // @ts-ignore
      expect(StringValidationUtil.sanitizeString(null)).toBe('***');
      // @ts-ignore
      expect(StringValidationUtil.sanitizeString(undefined)).toBe('***');
      // @ts-ignore
      expect(StringValidationUtil.sanitizeString(123)).toBe('***');
    });

    it('should handle exactly minimum length strings', () => {
      const result = StringValidationUtil.sanitizeString('12345678');
      expect(result).toBe('***');
    });
  });

  describe('isLengthInRange', () => {
    it('should validate length ranges correctly', () => {
      expect(StringValidationUtil.isLengthInRange('test', 1, 10)).toBe(true);
      expect(StringValidationUtil.isLengthInRange('test', 5, 10)).toBe(false);
      expect(StringValidationUtil.isLengthInRange('test', 1, 3)).toBe(false);
    });

    it('should handle edge cases', () => {
      // @ts-ignore
      expect(StringValidationUtil.isLengthInRange(null, 1, 10)).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.isLengthInRange(undefined, 1, 10)).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.isLengthInRange(123, 1, 10)).toBe(false);
    });

    it('should handle boundary conditions', () => {
      expect(StringValidationUtil.isLengthInRange('test', 4, 4)).toBe(true);
      expect(StringValidationUtil.isLengthInRange('', 0, 0)).toBe(true);
    });
  });

  describe('containsOnlyChars', () => {
    it('should validate character sets correctly', () => {
      expect(StringValidationUtil.containsOnlyChars('123', '0123456789')).toBe(true);
      expect(StringValidationUtil.containsOnlyChars('abc', 'abcdef')).toBe(true);
      expect(StringValidationUtil.containsOnlyChars('abc', '123456')).toBe(false);
    });

    it('should handle empty strings and charsets', () => {
      expect(StringValidationUtil.containsOnlyChars('', '')).toBe(true);
      expect(StringValidationUtil.containsOnlyChars('a', '')).toBe(false);
      expect(StringValidationUtil.containsOnlyChars('', 'abc')).toBe(true);
    });

    it('should handle edge cases', () => {
      // @ts-ignore
      expect(StringValidationUtil.containsOnlyChars(null, 'abc')).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.containsOnlyChars(undefined, 'abc')).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.containsOnlyChars(123, 'abc')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim strings by default', () => {
      const result = StringValidationUtil.sanitizeInput('  test  ');
      expect(result).toBe('test');
    });

    it('should convert to lowercase', () => {
      const result = StringValidationUtil.sanitizeInput('TEST', { toLowerCase: true });
      expect(result).toBe('test');
    });

    it('should convert to uppercase', () => {
      const result = StringValidationUtil.sanitizeInput('test', { toUpperCase: true });
      expect(result).toBe('TEST');
    });

    it('should remove extra spaces', () => {
      const result = StringValidationUtil.sanitizeInput('test   multiple   spaces', {
        removeExtraSpaces: true,
      });
      expect(result).toBe('test multiple spaces');
    });

    it('should handle multiple options', () => {
      const result = StringValidationUtil.sanitizeInput('  TEST   STRING  ', {
        toLowerCase: true,
        removeExtraSpaces: true,
      });
      expect(result).toBe('test string');
    });

    it('should handle trim=false option', () => {
      const result = StringValidationUtil.sanitizeInput('  test  ', { trim: false });
      expect(result).toBe('  test  ');
    });

    it('should handle edge cases', () => {
      // @ts-ignore
      expect(StringValidationUtil.sanitizeInput(null)).toBe('');
      // @ts-ignore
      expect(StringValidationUtil.sanitizeInput(undefined)).toBe('');
      // @ts-ignore
      expect(StringValidationUtil.sanitizeInput(123)).toBe('');
    });

    it('should prioritize lowercase over uppercase', () => {
      const result = StringValidationUtil.sanitizeInput('TEST', {
        toLowerCase: true,
        toUpperCase: true,
      });
      expect(result).toBe('test');
    });
  });

  describe('generatePrefixedString', () => {
    it('should generate prefixed strings', () => {
      const result = StringValidationUtil.generatePrefixedString('USER_', 8);
      expect(result).toMatch(/^USER_.{8}$/);
      expect(result.length).toBe(13); // 5 (prefix) + 8 (random)
    });

    it('should use custom charset', () => {
      const result = StringValidationUtil.generatePrefixedString('ID_', 10, '0123456789');
      expect(result).toMatch(/^ID_[0-9]{10}$/);
    });
  });

  describe('validateStringArray', () => {
    it('should validate all strings in array', () => {
      const values = ['valid1', 'valid2', 'valid3'];
      const config: StringValidationConfig = { minLength: 1 };
      const results = StringValidationUtil.validateStringArray(values, config);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });

    it('should return validation errors for invalid strings', () => {
      const values = ['valid', '', 123];
      const config: StringValidationConfig = { minLength: 1 };
      const results = StringValidationUtil.validateStringArray(values, config);

      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(false);
      expect(results[2].isValid).toBe(false);
    });

    it('should handle empty array', () => {
      const results = StringValidationUtil.validateStringArray([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('containsForbiddenWords', () => {
    const forbiddenWords = ['spam', 'admin', 'test'];

    it('should detect forbidden words', () => {
      expect(StringValidationUtil.containsForbiddenWords('This is spam', forbiddenWords)).toBe(true);
      expect(StringValidationUtil.containsForbiddenWords('admin user', forbiddenWords)).toBe(true);
      expect(StringValidationUtil.containsForbiddenWords('clean content', forbiddenWords)).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(StringValidationUtil.containsForbiddenWords('SPAM content', forbiddenWords, false)).toBe(true);
      expect(StringValidationUtil.containsForbiddenWords('SPAM content', forbiddenWords, true)).toBe(false);
    });

    it('should handle edge cases', () => {
      // @ts-ignore
      expect(StringValidationUtil.containsForbiddenWords(null, forbiddenWords)).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.containsForbiddenWords(undefined, forbiddenWords)).toBe(false);
      // @ts-ignore
      expect(StringValidationUtil.containsForbiddenWords(123, forbiddenWords)).toBe(false);
    });

    it('should handle empty forbidden words list', () => {
      expect(StringValidationUtil.containsForbiddenWords('any content', [])).toBe(false);
    });

    it('should detect partial word matches', () => {
      expect(StringValidationUtil.containsForbiddenWords('spammer', forbiddenWords)).toBe(true);
      expect(StringValidationUtil.containsForbiddenWords('testing', forbiddenWords)).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = StringValidationUtil.validateString(longString, { maxLength: 5000 });
      expect(result.isValid).toBe(false);
    });

    it('should handle unicode characters', () => {
      const unicodeString = '你好世界🌍';
      const result = StringValidationUtil.validateString(unicodeString);
      expect(result.isValid).toBe(true);
    });

    it('should handle special regex characters', () => {
      const pattern = /\$\d+\.\d{2}/; // Pattern for currency like $12.34
      expect(StringValidationUtil.matchesPattern('$12.34', pattern)).toBe(true);
      expect(StringValidationUtil.matchesPattern('12.34', pattern)).toBe(false);
    });

    it('should handle extreme generation lengths', () => {
      const result1 = StringValidationUtil.generateRandomString({ length: 0 });
      expect(result1).toBe('');

      const result2 = StringValidationUtil.generateRandomString({ length: 1000 });
      expect(result2.length).toBe(1000);
    });
  });
});