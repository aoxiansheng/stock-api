import {
  RateLimitStrategy,
  TIME_MULTIPLIERS,
  RATE_LIMIT_VALIDATION,
  RateLimitOperation,
  RateLimitMessage,
} from '@auth/constants/rate-limiting.constants';

describe('Rate Limiting Constants', () => {
  describe('RateLimitStrategy', () => {
    it('应该正确定义频率限制策略枚举', () => {
      // Assert
      expect(RateLimitStrategy).toBeDefined();
      expect(RateLimitStrategy.FIXED_WINDOW).toBe('fixed_window');
      expect(RateLimitStrategy.SLIDING_WINDOW).toBe('sliding_window');
      expect(RateLimitStrategy.TOKEN_BUCKET).toBe('token_bucket');
      expect(RateLimitStrategy.LEAKY_BUCKET).toBe('leaky_bucket');
    });
  });

  describe('TIME_MULTIPLIERS', () => {
    it('应该正确定义时间倍数常量', () => {
      // Assert
      expect(TIME_MULTIPLIERS).toBeDefined();
      expect(TIME_MULTIPLIERS.s).toBe(1);
      expect(TIME_MULTIPLIERS.m).toBe(60);
      expect(TIME_MULTIPLIERS.h).toBe(3600);
      expect(TIME_MULTIPLIERS.d).toBe(86400);
      expect(TIME_MULTIPLIERS.w).toBe(604800);
      expect(TIME_MULTIPLIERS.M).toBe(2592000);
    });
  });

  describe('RATE_LIMIT_VALIDATION', () => {
    it('应该正确定义频率限制验证常量', () => {
      // Assert
      expect(RATE_LIMIT_VALIDATION).toBeDefined();
      expect(RATE_LIMIT_VALIDATION.WINDOW_PATTERN).toBeDefined();
      expect(RATE_LIMIT_VALIDATION.APP_KEY_PATTERN).toBeDefined();
      expect(RATE_LIMIT_VALIDATION.MIN_APP_KEY_LENGTH).toBe(32);
      expect(RATE_LIMIT_VALIDATION.MAX_APP_KEY_LENGTH).toBe(64);
    });
  });

  describe('RateLimitOperation', () => {
    it('应该正确定义频率限制操作枚举', () => {
      // Assert
      expect(RateLimitOperation).toBeDefined();
      expect(RateLimitOperation.CHECK_RATE_LIMIT).toBe('checkRateLimit');
      expect(RateLimitOperation.CHECK_FIXED_WINDOW).toBe('checkFixedWindow');
      expect(RateLimitOperation.CHECK_SLIDING_WINDOW).toBe('checkSlidingWindow');
      expect(RateLimitOperation.RESET_RATE_LIMIT).toBe('resetRateLimit');
    });
  });

  describe('RateLimitMessage', () => {
    it('应该正确定义频率限制消息枚举', () => {
      // Assert
      expect(RateLimitMessage).toBeDefined();
      expect(RateLimitMessage.RATE_LIMIT_CHECK_STARTED).toBe('开始频率限制检查');
      expect(RateLimitMessage.RATE_LIMIT_CHECK_FAILED).toBe('频率限制检查失败');
      expect(RateLimitMessage.FIXED_WINDOW_CHECK).toBe('固定窗口检查');
      expect(RateLimitMessage.FIXED_WINDOW_EXCEEDED).toBe('固定窗口超出限制');
      expect(RateLimitMessage.SLIDING_WINDOW_CHECK).toBe('滑动窗口检查');
      expect(RateLimitMessage.SLIDING_WINDOW_EXCEEDED).toBe('滑动窗口超出限制');
      expect(RateLimitMessage.UNSUPPORTED_STRATEGY_RESET).toBe('不支持的策略重置');
      expect(RateLimitMessage.RATE_LIMIT_RESET).toBe('频率限制已重置');
    });
  });
});