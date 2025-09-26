import {
  AUTH_ERROR_CODES,
  type AuthErrorCode,
} from '@auth/constants/index';
import {
  USER_REGISTRATION,
} from '@auth/constants/user-operations.constants';
import {
  RateLimitStrategy,
} from '@auth/constants/rate-limiting.constants';
import {
  PERMISSION_CONFIG,
} from '@auth/constants/permission-control.constants';

describe('Auth Constants Index', () => {
  describe('Error Codes Export', () => {
    it('应该正确导出错误码常量', () => {
      // Assert
      expect(AUTH_ERROR_CODES).toBeDefined();
      expect(AUTH_ERROR_CODES.INVALID_API_KEY_FORMAT).toBe('AUTH_VALIDATION_001');
    });

    it('应该正确导出AuthErrorCode类型', () => {
      // Arrange
      const errorCode: AuthErrorCode = 'AUTH_VALIDATION_001';

      // Assert
      expect(errorCode).toBe(AUTH_ERROR_CODES.INVALID_API_KEY_FORMAT);
    });
  });

  describe('User Operations Export', () => {
    it('应该正确导出用户操作常量', () => {
      // Assert
      expect(USER_REGISTRATION).toBeDefined();
      expect(USER_REGISTRATION.USERNAME_MIN_LENGTH).toBe(3);
    });
  });

  describe('Rate Limiting Export', () => {
    it('应该正确导出频率限制常量', () => {
      // Assert
      expect(RateLimitStrategy).toBeDefined();
      expect(RateLimitStrategy.FIXED_WINDOW).toBe('fixed_window');
    });
  });

  describe('Permission Control Export', () => {
    it('应该正确导出权限控制常量', () => {
      // Assert
      expect(PERMISSION_CONFIG).toBeDefined();
      expect(PERMISSION_CONFIG.CACHE_KEY_SEPARATOR).toBe(':');
    });
  });
});