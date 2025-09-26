import { ApiKeyUtil } from '@auth/utils/apikey.utils';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('12345678-1234-1234-1234-123456789012'),
}));

// Mock StringValidationUtil
jest.mock('../../../../src/common/utils/string-validation.util', () => ({
  StringValidationUtil: {
    generateRandomString: jest.fn().mockImplementation(({ length }) => 'a'.repeat(length)),
    matchesPattern: jest.fn().mockImplementation((str, pattern) => pattern.test ? pattern.test(str) : str.includes(pattern)),
    isValidName: jest.fn().mockReturnValue(true),
    sanitizeString: jest.fn().mockImplementation((str, start, end, mask) => 
      str.substring(0, start) + mask.repeat(4) + str.substring(str.length - end)
    ),
  },
}));

describe('ApiKeyUtil', () => {
  describe('generateAppKey', () => {
    it('should generate an app key with prefix and UUID', () => {
      const result = ApiKeyUtil.generateAppKey();
      
      expect(result).toBe('app_12345678-1234-1234-1234-123456789012');
    });
  });

  describe('generateAccessToken', () => {
    it('should generate an access token with default length', () => {
      const result = ApiKeyUtil.generateAccessToken();
      
      expect(result).toBe('a'.repeat(64));
    });

    it('should generate an access token with specified length', () => {
      const result = ApiKeyUtil.generateAccessToken(32);
      
      expect(result).toBe('a'.repeat(32));
    });
  });

  describe('isValidAppKey', () => {
    it('should validate correct app key format', () => {
      const result = ApiKeyUtil.isValidAppKey('app_test-key_123');
      
      expect(result).toBe(true);
    });

    it('should reject invalid app key format', () => {
      // Mock the validation to return false for this specific test
      require('../../../../src/common/utils/string-validation.util').StringValidationUtil.matchesPattern.mockReturnValueOnce(false);
      
      const result = ApiKeyUtil.isValidAppKey('invalid key');
      
      expect(result).toBe(false);
    });
  });

  describe('isValidAccessToken', () => {
    it('should validate correct access token format', () => {
      const result = ApiKeyUtil.isValidAccessToken('valid-access-token');
      
      expect(result).toBe(true);
    });

    it('should reject invalid access token format', () => {
      // Mock the validation to return false for this specific test
      require('../../../../src/common/utils/string-validation.util').StringValidationUtil.matchesPattern.mockReturnValueOnce(false);
      
      const result = ApiKeyUtil.isValidAccessToken('invalid token');
      
      expect(result).toBe(false);
    });
  });

  describe('isValidName', () => {
    it('should validate correct name format', () => {
      const result = ApiKeyUtil.isValidName('Valid Name');
      
      expect(result).toBe(true);
    });

    it('should reject invalid name format', () => {
      // Mock the validation to return false for this specific test
      require('../../../../src/common/utils/string-validation.util').StringValidationUtil.isValidName.mockReturnValueOnce(false);
      
      const result = ApiKeyUtil.isValidName('Invalid Name!');
      
      expect(result).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return false for null expiration', () => {
      const result = ApiKeyUtil.isExpired(null);
      
      expect(result).toBe(false);
    });

    it('should return true for expired key', () => {
      const expiredDate = new Date(Date.now() - 10000); // 10 seconds ago
      const result = ApiKeyUtil.isExpired(expiredDate);
      
      expect(result).toBe(true);
    });

    it('should return false for non-expired key', () => {
      const futureDate = new Date(Date.now() + 10000); // 10 seconds in the future
      const result = ApiKeyUtil.isExpired(futureDate);
      
      expect(result).toBe(false);
    });
  });

  describe('isNearExpiry', () => {
    it('should return false for null expiration', () => {
      const result = ApiKeyUtil.isNearExpiry(null);
      
      expect(result).toBe(false);
    });

    it('should return true for key near expiry', () => {
      const nearExpiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      const result = ApiKeyUtil.isNearExpiry(nearExpiryDate, 7);
      
      expect(result).toBe(true);
    });

    it('should return false for key not near expiry', () => {
      const farExpiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const result = ApiKeyUtil.isNearExpiry(farExpiryDate, 7);
      
      expect(result).toBe(false);
    });
  });

  describe('calculateUsagePercentage', () => {
    it('should calculate correct percentage', () => {
      const result = ApiKeyUtil.calculateUsagePercentage(50, 100);
      
      expect(result).toBe(50);
    });

    it('should handle zero limit', () => {
      const result = ApiKeyUtil.calculateUsagePercentage(50, 0);
      
      expect(result).toBe(0);
    });

    it('should round to nearest integer', () => {
      const result = ApiKeyUtil.calculateUsagePercentage(33, 100);
      
      expect(result).toBe(33);
    });
  });

  describe('generateDefaultName', () => {
    it('should generate default name with index', () => {
      const result = ApiKeyUtil.generateDefaultName(2);
      
      expect(result).toBe('API Key 2');
    });

    it('should generate default name with default index', () => {
      const result = ApiKeyUtil.generateDefaultName();
      
      expect(result).toBe('API Key 1');
    });
  });

  describe('sanitizeAccessToken', () => {
    it('should sanitize access token for logging', () => {
      const result = ApiKeyUtil.sanitizeAccessToken('abcdefghijklmnopqrstuvwxyz');
      
      expect(result).toBe('abcd****xyz');
    });
  });
});