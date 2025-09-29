import { Types } from 'mongoose';
import { UserRole } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

/**
 * 用户数据工厂 - 创建测试用户数据
 */
export class UserFactory {
  /**
   * 创建模拟用户对象
   */
  static createMockUser(overrides: Partial<any> = {}) {
    return {
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: '$2b$12$hashedpassword.example.hash.string',
      role: UserRole.DEVELOPER,
      status: OperationStatus.ACTIVE,
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
      updatedAt: new Date('2024-01-01T10:00:00.000Z'),
      lastAccessedAt: new Date('2024-01-01T11:30:00.000Z'),
      isEmailVerified: true,
      preferences: {
        language: 'en',
        timezone: 'UTC',
        notifications: true,
      },
      metadata: {
        loginCount: 5,
        lastLoginIp: '127.0.0.1',
        accountSource: 'signup',
      },
      ...overrides,
    };
  }

  /**
   * 创建管理员用户
   */
  static createAdminUser(overrides: Partial<any> = {}) {
    return this.createMockUser({
      _id: new Types.ObjectId('507f1f77bcf86cd799439021'),
      id: '507f1f77bcf86cd799439021',
      username: 'admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      ...overrides,
    });
  }

  /**
   * 创建开发者用户
   */
  static createDeveloperUser(overrides: Partial<any> = {}) {
    return this.createMockUser({
      _id: new Types.ObjectId('507f1f77bcf86cd799439022'),
      id: '507f1f77bcf86cd799439022',
      username: 'developer',
      email: 'developer@example.com',
      role: UserRole.DEVELOPER,
      ...overrides,
    });
  }

  /**
   * 创建访客用户（使用DEVELOPER角色但状态为INACTIVE）
   */
  static createGuestUser(overrides: Partial<any> = {}) {
    return this.createMockUser({
      _id: new Types.ObjectId('507f1f77bcf86cd799439023'),
      id: '507f1f77bcf86cd799439023',
      username: 'guest',
      email: 'guest@example.com',
      role: UserRole.DEVELOPER,
      status: OperationStatus.INACTIVE,
      ...overrides,
    });
  }

  /**
   * 创建多个用户
   */
  static createMockUsers(count: number, baseOverrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.createMockUser({
        _id: new Types.ObjectId(`507f1f77bcf86cd79943901${i.toString().padStart(1, '0')}`),
        id: `507f1f77bcf86cd79943901${i.toString().padStart(1, '0')}`,
        username: `testuser${i}`,
        email: `test${i}@example.com`,
        ...baseOverrides,
      })
    );
  }

  /**
   * 创建用户登录响应
   */
  static createMockLoginResponse(userOverrides: Partial<any> = {}) {
    return {
      user: this.createMockUser(userOverrides),
      accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.access.token',
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.refresh.token',
      expiresIn: 86400, // 24 hours
      tokenType: 'Bearer',
      scope: 'read write',
    };
  }

  /**
   * 创建用户注册数据
   */
  static createMockRegistrationData(overrides: Partial<any> = {}) {
    return {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
      role: UserRole.DEVELOPER,
      acceptTerms: true,
      ...overrides,
    };
  }

  /**
   * 创建用户更新数据
   */
  static createMockUpdateData(overrides: Partial<any> = {}) {
    return {
      email: 'updated@example.com',
      preferences: {
        language: 'zh',
        timezone: 'Asia/Shanghai',
        notifications: false,
      },
      ...overrides,
    };
  }
}