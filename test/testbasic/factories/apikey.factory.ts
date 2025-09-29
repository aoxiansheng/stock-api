import { Types } from 'mongoose';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

/**
 * API Key数据工厂 - 创建测试API Key数据
 */
export class ApiKeyFactory {
  /**
   * 创建模拟API Key对象
   */
  static createMockApiKey(overrides: Partial<any> = {}) {
    return {
      _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
      id: '507f1f77bcf86cd799439012',
      name: 'Test API Key',
      appKey: 'ak_live_1234567890abcdef',
      keyPrefix: 'ak_live_',
      key: 'ak_live_1234567890abcdef1234567890abcdef',
      keyHash: '$2b$12$hashedapikey.example.hash.string',
      userId: '507f1f77bcf86cd799439011',
      permissions: [Permission.DATA_READ],
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerDay: 50000,
        burstLimit: 100,
      },
      status: OperationStatus.ACTIVE,
      expiresAt: new Date('2025-01-01T12:00:00.000Z'),
      lastUsedAt: new Date('2024-01-01T11:00:00.000Z'),
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
      updatedAt: new Date('2024-01-01T10:00:00.000Z'),
      usage: {
        totalRequests: 12345,
        requestsToday: 100,
        lastRequestAt: new Date('2024-01-01T11:00:00.000Z'),
        averageResponseTime: 150,
      },
      metadata: {
        description: 'Test API key for development',
        environment: 'test',
        ipWhitelist: ['127.0.0.1', '192.168.1.0/24'],
        userAgent: 'Test Client/1.0',
      },
      ...overrides,
    };
  }

  /**
   * 创建只读权限API Key
   */
  static createReadOnlyApiKey(overrides: Partial<any> = {}) {
    return this.createMockApiKey({
      _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
      id: '507f1f77bcf86cd799439013',
      name: 'Read Only API Key',
      appKey: 'ak_live_readonly123456',
      key: 'ak_live_readonly123456readonly123456readonly',
      permissions: [Permission.DATA_READ],
      rateLimit: {
        requestsPerMinute: 500,
        requestsPerDay: 10000,
        burstLimit: 50,
      },
      ...overrides,
    });
  }

  /**
   * 创建完整权限API Key
   */
  static createFullPermissionApiKey(overrides: Partial<any> = {}) {
    return this.createMockApiKey({
      _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
      id: '507f1f77bcf86cd799439014',
      name: 'Full Permission API Key',
      appKey: 'ak_live_fullperm789012',
      key: 'ak_live_fullperm789012fullperm789012fullperm',
      permissions: [
        Permission.DATA_READ,
        Permission.DATA_WRITE,
        Permission.USER_MANAGE,
        Permission.SYSTEM_ADMIN,
      ],
      rateLimit: {
        requestsPerMinute: 2000,
        requestsPerDay: 100000,
        burstLimit: 200,
      },
      ...overrides,
    });
  }

  /**
   * 创建过期的API Key
   */
  static createExpiredApiKey(overrides: Partial<any> = {}) {
    return this.createMockApiKey({
      _id: new Types.ObjectId('507f1f77bcf86cd799439015'),
      id: '507f1f77bcf86cd799439015',
      name: 'Expired API Key',
      appKey: 'ak_live_expired345678',
      key: 'ak_live_expired345678expired345678expired34',
      status: OperationStatus.INACTIVE,
      expiresAt: new Date('2023-01-01T12:00:00.000Z'), // 已过期
      ...overrides,
    });
  }

  /**
   * 创建多个API Key
   */
  static createMockApiKeys(count: number, baseOverrides: Partial<any> = {}) {
    return Array.from({ length: count }, (_, i) =>
      this.createMockApiKey({
        _id: new Types.ObjectId(`507f1f77bcf86cd79943902${i.toString().padStart(1, '0')}`),
        id: `507f1f77bcf86cd79943902${i.toString().padStart(1, '0')}`,
        name: `Test API Key ${i + 1}`,
        appKey: `ak_live_test${i.toString().padStart(6, '0')}`,
        key: `ak_live_test${i.toString().padStart(6, '0')}${'x'.repeat(32 - 14 - i.toString().length)}`,
        ...baseOverrides,
      })
    );
  }

  /**
   * 创建API Key创建请求数据
   */
  static createMockCreateApiKeyDto(overrides: Partial<any> = {}) {
    return {
      name: 'New Test API Key',
      permissions: [Permission.DATA_READ],
      rateLimit: {
        requestsPerMinute: 1000,
        requestsPerDay: 50000,
      },
      expiresAt: new Date('2025-12-31T23:59:59.000Z'),
      description: 'API key for testing purposes',
      environment: 'development',
      ipWhitelist: ['127.0.0.1'],
      ...overrides,
    };
  }

  /**
   * 创建API Key更新请求数据
   */
  static createMockUpdateApiKeyDto(overrides: Partial<any> = {}) {
    return {
      name: 'Updated API Key Name',
      permissions: [Permission.DATA_READ, Permission.DATA_WRITE],
      rateLimit: {
        requestsPerMinute: 1500,
        requestsPerDay: 75000,
      },
      status: OperationStatus.ACTIVE,
      description: 'Updated description',
      ipWhitelist: ['127.0.0.1', '192.168.1.100'],
      ...overrides,
    };
  }

  /**
   * 创建API Key使用统计数据
   */
  static createMockApiKeyUsage(overrides: Partial<any> = {}) {
    return {
      apiKeyId: '507f1f77bcf86cd799439012',
      date: new Date('2024-01-01'),
      requestCount: 1000,
      errorCount: 5,
      averageResponseTime: 150,
      topEndpoints: [
        { endpoint: '/api/v1/data', count: 500 },
        { endpoint: '/api/v1/quotes', count: 300 },
        { endpoint: '/api/v1/symbols', count: 200 },
      ],
      httpStatusCodes: {
        '200': 950,
        '400': 30,
        '401': 10,
        '404': 5,
        '500': 5,
      },
      ...overrides,
    };
  }
}