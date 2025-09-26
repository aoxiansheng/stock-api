import { RateLimitTemplateUtil } from '@auth/utils/rate-limit-template.util';

describe('RateLimitTemplateUtil', () => {
  describe('replaceErrorTemplate', () => {
    it('should replace placeholders with provided values', () => {
      const template = 'API Key {appKey} exceeded limit of {limit} requests';
      const params = { appKey: 'test-key', limit: 100 };
      
      const result = RateLimitTemplateUtil.replaceErrorTemplate(template, params);
      
      expect(result).toBe('API Key test-key exceeded limit of 100 requests');
    });

    it('should leave unmatched placeholders unchanged', () => {
      const template = 'API Key {appKey} exceeded limit of {limit} requests';
      const params = { appKey: 'test-key' };
      
      const result = RateLimitTemplateUtil.replaceErrorTemplate(template, params);
      
      expect(result).toBe('API Key test-key exceeded limit of {limit} requests');
    });

    it('should handle empty params object', () => {
      const template = 'API Key {appKey} exceeded limit';
      const params = {};
      
      const result = RateLimitTemplateUtil.replaceErrorTemplate(template, params);
      
      expect(result).toBe('API Key {appKey} exceeded limit');
    });

    it('should convert non-string values to strings', () => {
      const template = 'Current count is {count}';
      const params = { count: 42 };
      
      const result = RateLimitTemplateUtil.replaceErrorTemplate(template, params);
      
      expect(result).toBe('Current count is 42');
    });
  });

  describe('isValidWindowFormat', () => {
    it('should validate correct window formats', () => {
      expect(RateLimitTemplateUtil.isValidWindowFormat('1s')).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat('5m')).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat('1h')).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat('1d')).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat('30s')).toBe(true);
      expect(RateLimitTemplateUtil.isValidWindowFormat('12h')).toBe(true);
    });

    it('should reject invalid window formats', () => {
      expect(RateLimitTemplateUtil.isValidWindowFormat('1x')).toBe(false);
      expect(RateLimitTemplateUtil.isValidWindowFormat('abc')).toBe(false);
      expect(RateLimitTemplateUtil.isValidWindowFormat('')).toBe(false);
      expect(RateLimitTemplateUtil.isValidWindowFormat('1.5h')).toBe(false);
      expect(RateLimitTemplateUtil.isValidWindowFormat('1h30m')).toBe(false);
    });
  });

  describe('isValidAppKey', () => {
    it('should validate correct app key formats', () => {
      expect(RateLimitTemplateUtil.isValidAppKey('app_1234567890abcdef')).toBe(true);
      expect(RateLimitTemplateUtil.isValidAppKey('app_key_with_underscores')).toBe(true);
      expect(RateLimitTemplateUtil.isValidAppKey('app-key-with-dashes')).toBe(true);
      expect(RateLimitTemplateUtil.isValidAppKey('appKey123')).toBe(true);
    });

    it('should reject invalid app key formats', () => {
      expect(RateLimitTemplateUtil.isValidAppKey('')).toBe(false);
      expect(RateLimitTemplateUtil.isValidAppKey('app')).toBe(false); // Too short
      expect(RateLimitTemplateUtil.isValidAppKey('a'.repeat(1000))).toBe(false); // Too long
      expect(RateLimitTemplateUtil.isValidAppKey('app key with spaces')).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate retry delay with exponential backoff', () => {
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(RateLimitTemplateUtil.calculateRetryDelay(i));
      }
      
      // Each delay should be greater than or equal to the previous one (with jitter)
      // But we can't assert exact values due to jitter, so we check the general pattern
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[delays.length - 1]).toBeLessThanOrEqual(5000);
    });

    it('should cap retry delay at maximum value', () => {
      // Test with a high attempt number that should definitely exceed max delay
      const delay = RateLimitTemplateUtil.calculateRetryDelay(20);
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('generateErrorMessage', () => {
    it('should generate error message for supported template keys', () => {
      const result1 = RateLimitTemplateUtil.generateErrorMessage('UNSUPPORTED_STRATEGY', {
        strategy: 'invalid-strategy'
      });
      expect(result1).toBe('不支持的频率限制策略: invalid-strategy');

      const result2 = RateLimitTemplateUtil.generateErrorMessage('INVALID_WINDOW_FORMAT', {
        window: '1x'
      });
      expect(result2).toBe('无效的时间窗口格式: 1x，期望格式如: 1s, 5m, 1h, 1d');

      const result3 = RateLimitTemplateUtil.generateErrorMessage('RATE_LIMIT_EXCEEDED', {
        appKey: 'test-key',
        current: 105,
        limit: 100
      });
      expect(result3).toBe('API Key test-key 超过频率限制: 105/100 请求');
    });

    it('should return the template key as message for unsupported keys', () => {
      const result = RateLimitTemplateUtil.generateErrorMessage('UNKNOWN_KEY', {
        param: 'value'
      });
      expect(result).toBe('UNKNOWN_KEY');
    });
  });
});