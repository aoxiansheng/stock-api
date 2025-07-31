/**
 * ApiKeyUtil 单元测试
 * 测试 API Key 工具类的各种功能
 */

import { ApiKeyUtil } from '../../../../../src/auth/utils/apikey.utils';

// Mock uuid 模块
jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789012'),
}));

// Mock constants
jest.mock('../../../../../src/auth/constants/apikey.constants', () => ({
  APIKEY_DEFAULTS: {
    APP_KEY_PREFIX: 'sk-',
    ACCESS_TOKEN_LENGTH: 32,
    DEFAULT_NAME_PREFIX: 'API Key',
  },
  APIKEY_CONFIG: {
    ACCESS_TOKEN_CHARSET: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    MIN_NAME_LENGTH: 1,
    MAX_NAME_LENGTH: 100,
  },
  APIKEY_VALIDATION_RULES: {
    APP_KEY_PATTERN: /^sk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    ACCESS_TOKEN_PATTERN: /^[a-zA-Z0-9]{32}$/,
    NAME_PATTERN: /^[a-zA-Z0-9\s\-_\.]+$/,
  },
  APIKEY_TIME_CONFIG: {
    EXPIRY_WARNING_DAYS: 7,
  },
}));

describe('ApiKeyUtil', () => {
  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();
    
    // 使用模拟的系统时间
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-06-01T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateAppKey', () => {
    it('should generate app key with correct prefix and UUID format', () => {
      // Act
      const appKey = ApiKeyUtil.generateAppKey();

      // Assert
      expect(appKey).toBe('sk-12345678-1234-1234-1234-123456789012');
      expect(appKey).toMatch(/^sk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate unique app keys on multiple calls', () => {
      // Arrange - 模拟不同的 UUID 返回值
      const { v4: uuidv4 } = require('uuid');
      (uuidv4 as jest.Mock)
        .mockReturnValueOnce('aaaaaaaa-1111-2222-3333-444444444444')
        .mockReturnValueOnce('bbbbbbbb-5555-6666-7777-888888888888')
        .mockReturnValueOnce('cccccccc-9999-aaaa-bbbb-cccccccccccc');

      // Act
      const appKey1 = ApiKeyUtil.generateAppKey();
      const appKey2 = ApiKeyUtil.generateAppKey();
      const appKey3 = ApiKeyUtil.generateAppKey();

      // Assert
      expect(appKey1).toBe('sk-aaaaaaaa-1111-2222-3333-444444444444');
      expect(appKey2).toBe('sk-bbbbbbbb-5555-6666-7777-888888888888');
      expect(appKey3).toBe('sk-cccccccc-9999-aaaa-bbbb-cccccccccccc');
      expect(new Set([appKey1, appKey2, appKey3]).size).toBe(3);
    });
  });

  describe('generateAccessToken', () => {
    beforeEach(() => {
      // 模拟 Math.random 方法
      jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
    });

    afterEach(() => {
      // 使用正确的方式恢复 Math.random 的原始实现
      jest.restoreAllMocks();
    });

    it('should generate access token with default length', () => {
      // Act
      const token = ApiKeyUtil.generateAccessToken();

      // Assert
      expect(token).toHaveLength(32);
      expect(token).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate access token with custom length', () => {
      // Act
      const shortToken = ApiKeyUtil.generateAccessToken(16);
      const longToken = ApiKeyUtil.generateAccessToken(64);

      // Assert
      expect(shortToken).toHaveLength(16);
      expect(longToken).toHaveLength(64);
      expect(shortToken).toMatch(/^[A-Za-z0-9]+$/);
      expect(longToken).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate tokens with characters from the specified charset', () => {
      // Arrange - 模拟不同的随机值
      (Math.random as jest.Mock)
        .mockReturnValueOnce(0) // 第一个字符 'A'
        .mockReturnValueOnce(0.5) // 中间字符
        .mockReturnValueOnce(0.99); // 最后字符 '9'

      // Act
      const token = ApiKeyUtil.generateAccessToken(3);

      // Assert
      expect(token).toHaveLength(3);
      expect(token[0]).toBe('a'); // 第一个字符 (based on charset starting with 'a')
      expect(token).toMatch(/^[A-Za-z0-9]{3}$/);
    });

    it('should handle edge case of zero length', () => {
      // Act
      const emptyToken = ApiKeyUtil.generateAccessToken(0);

      // Assert
      expect(emptyToken).toBe('');
      expect(emptyToken).toHaveLength(0);
    });
  });

  describe('isValidAppKey', () => {
    it('should validate correct app key format', () => {
      // Arrange
      const validAppKeys = [
        'sk-12345678-1234-1234-1234-123456789abc',
        'sk-abcdef12-5678-9012-3456-789abcdef012',
        'sk-00000000-0000-0000-0000-000000000000',
      ];

      // Act & Assert
      validAppKeys.forEach(appKey => {
        expect(ApiKeyUtil.isValidAppKey(appKey)).toBe(true);
      });
    });

    it('should reject invalid app key formats', () => {
      // Arrange
      const invalidAppKeys = [
        'invalid-key',
        'sk-invalid-uuid',
        'key-12345678-1234-1234-1234-123456789abc', // 前缀错误
        'sk-12345678-1234-1234-1234-123456789abcd', // UUID 过长
        'sk-12345678-1234-1234-1234-123456789ab', // UUID 过短
        'sk-GGGGGGGG-1234-1234-1234-123456789abc', // 包含非法字符
        '', // 空字符串
        'sk-', // 只有前缀
      ];

      // Act & Assert
      invalidAppKeys.forEach(appKey => {
        expect(ApiKeyUtil.isValidAppKey(appKey)).toBe(false);
      });
    });
  });

  describe('isValidAccessToken', () => {
    it('should validate correct access token format', () => {
      // Arrange
      const validTokens = [
        'A'.repeat(32), // 全大写字母
        'a'.repeat(32), // 全小写字母
        '0'.repeat(32), // 全数字
        'A1b2C3d4e5F6A1b2C3d4e5F6A1b2C3d4', // 混合字符，总长度32
      ];

      // Act & Assert
      validTokens.forEach(token => {
        expect(ApiKeyUtil.isValidAccessToken(token)).toBe(true);
      });
    });

    it('should reject invalid access token formats', () => {
      // Arrange
      const invalidTokens = [
        'A'.repeat(31), // 长度不足
        'A'.repeat(33), // 长度过长
        'A'.repeat(32) + '!', // 包含非法字符
        'A B'.repeat(8), // 包含空格
        '', // 空字符串
        'abc@def#'.repeat(4), // 包含特殊字符
      ];

      // Act & Assert
      invalidTokens.forEach(token => {
        expect(ApiKeyUtil.isValidAccessToken(token)).toBe(false);
      });
    });
  });

  describe('isValidName', () => {
    it('should validate correct API key names', () => {
      // Arrange
      const validNames = [
        'My API Key',
        'Production-Key',
        'test_key_123',
        'API.Key.1',
        'Simple',
        'a'.repeat(100), // 最大长度
      ];

      // Act & Assert
      validNames.forEach(name => {
        expect(ApiKeyUtil.isValidName(name)).toBe(true);
      });
    });

    it('should reject invalid API key names', () => {
      // Arrange
      const invalidNames: (string | null | undefined)[] = [
        null,
        undefined,
        '', // 空字符串
        'a'.repeat(101), // 太长
        'Key@Invalid', // 包含特殊字符
        'Key#Test', // 包含特殊字符
        'Key&Name', // 包含特殊字符
      ];

      // Act & Assert
      invalidNames.forEach(name => {
        expect(ApiKeyUtil.isValidName(name)).toBe(false);
      });
    });
  });

  describe('isExpired', () => {
    it('should return false for null expiration date', () => {
      // Act & Assert
      expect(ApiKeyUtil.isExpired(null)).toBe(false);
    });

    it('should return true for past expiration date', () => {
      // Arrange
      const pastDate = new Date('2023-05-01T10:00:00.000Z'); // 过去日期

      // Act & Assert
      expect(ApiKeyUtil.isExpired(pastDate)).toBe(true);
    });

    it('should return false for future expiration date', () => {
      // Arrange
      const futureDate = new Date('2023-07-01T10:00:00.000Z'); // 未来日期

      // Act & Assert
      expect(ApiKeyUtil.isExpired(futureDate)).toBe(false);
    });

    it('should return true for current time expiration', () => {
      // Arrange
      const currentDate = new Date('2023-06-01T10:00:00.000Z'); // 当前日期

      // Act & Assert
      expect(ApiKeyUtil.isExpired(currentDate)).toBe(false);
      
      // 测试边界情况
      const slightlyPast = new Date('2023-06-01T09:59:59.999Z');
      expect(ApiKeyUtil.isExpired(slightlyPast)).toBe(true);
    });
  });

  describe('isNearExpiry', () => {
    it('should return false for null expiration date', () => {
      // Act & Assert
      expect(ApiKeyUtil.isNearExpiry(null)).toBe(false);
    });

    it('should return true for expiration within warning period', () => {
      // Arrange
      const nearExpiryDate = new Date('2023-06-05T10:00:00.000Z'); // 4天后

      // Act & Assert
      expect(ApiKeyUtil.isNearExpiry(nearExpiryDate)).toBe(true);
    });

    it('should return false for expiration beyond warning period', () => {
      // Arrange
      const farExpiryDate = new Date('2023-06-15T10:00:00.000Z'); // 14天后

      // Act & Assert
      expect(ApiKeyUtil.isNearExpiry(farExpiryDate)).toBe(false);
    });

    it('should use custom warning days', () => {
      // Arrange
      const expiryDate = new Date('2023-06-04T10:00:00.000Z'); // 3天后

      // Act & Assert
      expect(ApiKeyUtil.isNearExpiry(expiryDate, 2)).toBe(false); // 2天警告期
      expect(ApiKeyUtil.isNearExpiry(expiryDate, 5)).toBe(true);  // 5天警告期
    });

    it('should return true for already expired dates', () => {
      // Arrange
      const expiredDate = new Date('2023-05-25T10:00:00.000Z'); // 已过期

      // Act & Assert
      expect(ApiKeyUtil.isNearExpiry(expiredDate)).toBe(true);
    });
  });

  describe('calculateUsagePercentage', () => {
    it('should calculate correct usage percentage', () => {
      // Act & Assert
      expect(ApiKeyUtil.calculateUsagePercentage(50, 100)).toBe(50);
      expect(ApiKeyUtil.calculateUsagePercentage(75, 100)).toBe(75);
      expect(ApiKeyUtil.calculateUsagePercentage(100, 100)).toBe(100);
      expect(ApiKeyUtil.calculateUsagePercentage(0, 100)).toBe(0);
    });

    it('should handle edge cases', () => {
      // Act & Assert
      expect(ApiKeyUtil.calculateUsagePercentage(50, 0)).toBe(0); // 除以零
      expect(ApiKeyUtil.calculateUsagePercentage(0, 0)).toBe(0);   // 零除以零
      expect(ApiKeyUtil.calculateUsagePercentage(100, -10)).toBe(0); // 负数限制
    });

    it('should round to nearest integer', () => {
      // Act & Assert
      expect(ApiKeyUtil.calculateUsagePercentage(33, 100)).toBe(33);  // 33%
      expect(ApiKeyUtil.calculateUsagePercentage(333, 1000)).toBe(33); // 33.3% -> 33%
      expect(ApiKeyUtil.calculateUsagePercentage(335, 1000)).toBe(34); // 33.5% -> 34%
      expect(ApiKeyUtil.calculateUsagePercentage(337, 1000)).toBe(34); // 33.7% -> 34%
    });

    it('should handle usage exceeding limit', () => {
      // Act & Assert
      expect(ApiKeyUtil.calculateUsagePercentage(150, 100)).toBe(150); // 150%
      expect(ApiKeyUtil.calculateUsagePercentage(200, 100)).toBe(200); // 200%
    });
  });

  describe('generateDefaultName', () => {
    it('should generate default name with index', () => {
      // Act & Assert
      expect(ApiKeyUtil.generateDefaultName()).toBe('API Key 1');
      expect(ApiKeyUtil.generateDefaultName(1)).toBe('API Key 1');
      expect(ApiKeyUtil.generateDefaultName(2)).toBe('API Key 2');
      expect(ApiKeyUtil.generateDefaultName(10)).toBe('API Key 10');
    });

    it('should handle zero and negative indices', () => {
      // Act & Assert
      expect(ApiKeyUtil.generateDefaultName(0)).toBe('API Key 0');
      expect(ApiKeyUtil.generateDefaultName(-1)).toBe('API Key -1');
    });
  });

  describe('sanitizeAccessToken', () => {
    it('should sanitize long access tokens', () => {
      // Arrange
      const longToken = 'abcd1234567890efghijklmnopqrstuvwxyzABCDEFGH5678';

      // Act
      const sanitized = ApiKeyUtil.sanitizeAccessToken(longToken);

      // Assert
      expect(sanitized).toBe('abcd***5678');
      expect(sanitized.length).toBe(11); // 4 + 3 + 4
    });

    it('should sanitize short tokens to asterisks', () => {
      // Arrange
      const shortTokens = ['abc', '12345678', 'short'];

      // Act & Assert
      shortTokens.forEach(token => {
        expect(ApiKeyUtil.sanitizeAccessToken(token)).toBe('***');
      });
    });

    it('should handle exactly 8-character tokens', () => {
      // Arrange
      const eightCharToken = '12345678';

      // Act
      const sanitized = ApiKeyUtil.sanitizeAccessToken(eightCharToken);

      // Assert
      expect(sanitized).toBe('***'); // 8字符长度的令牌
    });

    it('should handle 9-character tokens correctly', () => {
      // Arrange
      const nineCharToken = '123456789';

      // Act
      const sanitized = ApiKeyUtil.sanitizeAccessToken(nineCharToken);

      // Assert
      expect(sanitized).toBe('1234***6789'); // 9字符长度的令牌
    });

    it('should handle empty and null tokens', () => {
      // Act & Assert
      expect(ApiKeyUtil.sanitizeAccessToken('')).toBe('***');
    });

    it('should preserve token security in logs', () => {
      // Arrange
      const realToken = 'sk_test_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH';

      // Act
      const sanitized = ApiKeyUtil.sanitizeAccessToken(realToken);

      // Assert
      expect(sanitized).toBe('sk_t***EFGH');
      expect(sanitized).not.toContain('abcdefghijk'); // 不应包含敏感部分
      expect(sanitized.length).toBeLessThan(realToken.length); // 长度应减少
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete API key workflow', () => {
      // Arrange & Act - 创建完整的 API Key 流程
      const appKey = ApiKeyUtil.generateAppKey();
      const accessToken = ApiKeyUtil.generateAccessToken();
      const name = 'Integration Test Key';

      // Assert - 验证有效性
      expect(ApiKeyUtil.isValidAppKey(appKey)).toBe(true);
      expect(ApiKeyUtil.isValidAccessToken(accessToken)).toBe(true);
      expect(ApiKeyUtil.isValidName(name)).toBe(true);

      // 过期检查
      const futureExpiry = new Date('2023-12-31T23:59:59.999Z');
      expect(ApiKeyUtil.isExpired(futureExpiry)).toBe(false);
      expect(ApiKeyUtil.isNearExpiry(futureExpiry)).toBe(false);

      // 使用率计算
      const usage = ApiKeyUtil.calculateUsagePercentage(100, 1000);
      expect(usage).toBe(10);

      // 令牌安全化
      const sanitizedToken = ApiKeyUtil.sanitizeAccessToken(accessToken);
      expect(sanitizedToken).toMatch(/^.{4}\*\*\*.{4}$/);
    });

    it('should handle expired key scenario', () => {
      // Arrange
      const expiredDate = new Date('2023-05-01T10:00:00.000Z');
      const usage = 950;
      const limit = 1000;

      // Act & Assert
      expect(ApiKeyUtil.isExpired(expiredDate)).toBe(true);
      expect(ApiKeyUtil.isNearExpiry(expiredDate)).toBe(true);
      expect(ApiKeyUtil.calculateUsagePercentage(usage, limit)).toBe(95);
    });
  });
});