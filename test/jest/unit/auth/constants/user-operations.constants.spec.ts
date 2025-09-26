import {
  USER_REGISTRATION,
  ACCOUNT_DEFAULTS,
} from '@auth/constants/user-operations.constants';

describe('User Operations Constants', () => {
  describe('USER_REGISTRATION', () => {
    it('应该正确定义用户注册常量', () => {
      // Assert
      expect(USER_REGISTRATION).toBeDefined();
      expect(USER_REGISTRATION.PASSWORD_PATTERN).toBeDefined();
      expect(USER_REGISTRATION.USERNAME_PATTERN).toBeDefined();
      expect(USER_REGISTRATION.EMAIL_PATTERN).toBeDefined();
      expect(USER_REGISTRATION.USERNAME_MIN_LENGTH).toBeDefined();
      expect(USER_REGISTRATION.USERNAME_MAX_LENGTH).toBeDefined();
      expect(USER_REGISTRATION.PASSWORD_MIN_LENGTH).toBeDefined();
      expect(USER_REGISTRATION.PASSWORD_MAX_LENGTH).toBeDefined();
      expect(USER_REGISTRATION.RESERVED_USERNAMES).toBeDefined();
    });

    it('应该正确验证用户名格式', () => {
      // Arrange
      const validUsernames = ['testuser', 'test_user', 'test-user', 'user123'];
      const invalidUsernames = ['test.user', 'test user', 'test@user'];

      // Act & Assert
      validUsernames.forEach(username => {
        expect(USER_REGISTRATION.USERNAME_PATTERN.test(username)).toBe(true);
      });

      invalidUsernames.forEach(username => {
        expect(USER_REGISTRATION.USERNAME_PATTERN.test(username)).toBe(false);
      });
    });

    it('应该正确验证密码格式', () => {
      // Arrange
      const validPasswords = ['Password123', 'Test123!@#', 'MyPass123'];
      const invalidPasswords = ['password', 'PASSWORD', '12345678', 'pass123'];

      // Act & Assert
      validPasswords.forEach(password => {
        expect(USER_REGISTRATION.PASSWORD_PATTERN.test(password)).toBe(true);
      });

      invalidPasswords.forEach(password => {
        expect(USER_REGISTRATION.PASSWORD_PATTERN.test(password)).toBe(false);
      });
    });

    it('应该正确验证邮箱格式', () => {
      // Arrange
      const validEmails = ['test@example.com', 'user.name@domain.co.uk'];
      const invalidEmails = ['invalid-email', 'test@', '@example.com'];

      // Act & Assert
      validEmails.forEach(email => {
        expect(USER_REGISTRATION.EMAIL_PATTERN.test(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(USER_REGISTRATION.EMAIL_PATTERN.test(email)).toBe(false);
      });
    });

    it('应该正确定义长度限制', () => {
      // Assert
      expect(USER_REGISTRATION.USERNAME_MIN_LENGTH).toBe(3);
      expect(USER_REGISTRATION.USERNAME_MAX_LENGTH).toBe(50);
      expect(USER_REGISTRATION.PASSWORD_MIN_LENGTH).toBe(8);
      expect(USER_REGISTRATION.PASSWORD_MAX_LENGTH).toBe(128);
    });

    it('应该包含保留用户名列表', () => {
      // Assert
      expect(Array.isArray(USER_REGISTRATION.RESERVED_USERNAMES)).toBe(true);
      expect(USER_REGISTRATION.RESERVED_USERNAMES.length).toBeGreaterThan(0);
      expect(USER_REGISTRATION.RESERVED_USERNAMES).toContain('admin');
      expect(USER_REGISTRATION.RESERVED_USERNAMES).toContain('root');
    });
  });

  describe('ACCOUNT_DEFAULTS', () => {
    it('应该正确定义账户默认值', () => {
      // Assert
      expect(ACCOUNT_DEFAULTS).toBeDefined();
      expect(ACCOUNT_DEFAULTS.ROLE).toBe('developer');
      expect(ACCOUNT_DEFAULTS.STATUS).toBe('active');
      expect(ACCOUNT_DEFAULTS.EMAIL_VERIFIED).toBe(false);
      expect(ACCOUNT_DEFAULTS.ACCOUNT_LOCKED).toBe(false);
      expect(ACCOUNT_DEFAULTS.TWO_FACTOR_ENABLED).toBe(false);
      expect(ACCOUNT_DEFAULTS.PASSWORD_RESET_REQUIRED).toBe(false);
    });
  });
});