import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  CreateApiKeyDto,
  ApiKeyResponseDto,
  ApiKeyUsageDto,
  UserDetailedStatsDto,
  UpdateApiKeyDto,
  RateLimitDto,
} from '@auth/dto/apikey.dto';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('ApiKey DTOs', () => {
  describe('RateLimitDto', () => {
    it('应该成功验证有效的速率限制数据', async () => {
      // Arrange
      const dto = plainToClass(RateLimitDto, {
        requestLimit: 1000,
        window: '1h',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在请求限制小于1时验证失败', async () => {
      // Arrange
      const dto = plainToClass(RateLimitDto, {
        requestLimit: 0, // 无效值
        window: '1h',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'requestLimit')).toBe(true);
    });

    it('应该在缺少时间窗口时验证失败', async () => {
      // Arrange
      const dto = plainToClass(RateLimitDto, {
        requestLimit: 1000,
        // 缺少window
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'window')).toBe(true);
    });
  });

  describe('CreateApiKeyDto', () => {
    it('应该成功验证有效的API Key创建数据', async () => {
      // Arrange
      const dto = plainToClass(CreateApiKeyDto, {
        name: 'Test API Key',
        description: 'Test API Key Description',
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
        rateLimit: {
          requestLimit: 1000,
          window: '1h',
        },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后过期
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在缺少必填名称时验证失败', async () => {
      // Arrange
      const dto = plainToClass(CreateApiKeyDto, {
        // 缺少name
        description: 'Test API Key Description',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('应该在名称超过最大长度时验证失败', async () => {
      // Arrange
      const dto = plainToClass(CreateApiKeyDto, {
        name: 'A'.repeat(101), // 超过100个字符
        description: 'Test API Key Description',
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'name')).toBe(true);
    });

    it('应该成功验证可选字段', async () => {
      // Arrange
      const dto = plainToClass(CreateApiKeyDto, {
        name: 'Test API Key',
        // 其他字段都是可选的
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在权限列表包含无效权限时验证失败', async () => {
      // Arrange
      const dto = plainToClass(CreateApiKeyDto, {
        name: 'Test API Key',
        permissions: ['INVALID_PERMISSION'], // 无效权限
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'permissions')).toBe(true);
    });
  });

  describe('UpdateApiKeyDto', () => {
    it('应该成功验证有效的API Key更新数据', async () => {
      // Arrange
      const dto = plainToClass(UpdateApiKeyDto, {
        name: 'Updated API Key',
        description: 'Updated API Key Description',
        permissions: [Permission.DATA_READ, Permission.DATA_WRITE],
        rateLimit: {
          requestLimit: 2000,
          window: '1h',
        },
        status: OperationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年后过期
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该成功验证所有可选字段都为空的情况', async () => {
      // Arrange
      const dto = plainToClass(UpdateApiKeyDto, {
        // 所有字段都是可选的
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('应该在状态字段无效时验证失败', async () => {
      // Arrange
      const dto = plainToClass(UpdateApiKeyDto, {
        status: 'INVALID_STATUS', // 无效状态
      });

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.property === 'status')).toBe(true);
    });
  });

  describe('ApiKeyResponseDto', () => {
    it('应该成功创建有效的API Key响应DTO', () => {
      // Arrange & Act
      const dto = new ApiKeyResponseDto();
      dto.id = 'apikey123';
      dto.appKey = 'app-key';
      dto.accessToken = 'access-token';
      dto.name = 'Test API Key';
      dto.description = 'Test API Key Description';
      dto.permissions = [Permission.DATA_READ];
      dto.rateLimit = {
        requestLimit: 1000,
        window: '1h',
      };
      dto.status = OperationStatus.ACTIVE;
      dto.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      dto.totalRequestCount = 0;
      dto.lastAccessedAt = new Date();
      dto.createdAt = new Date();

      // Assert
      expect(dto).toBeDefined();
      expect(dto.id).toBe('apikey123');
      expect(dto.appKey).toBe('app-key');
      expect(dto.name).toBe('Test API Key');
      expect(dto.permissions).toEqual([Permission.DATA_READ]);
      expect(dto.status).toBe(OperationStatus.ACTIVE);
    });
  });

  describe('ApiKeyUsageDto', () => {
    it('应该成功创建有效的API Key使用统计DTO', () => {
      // Arrange & Act
      const dto = new ApiKeyUsageDto();
      dto.apiKeyId = 'apikey123';
      dto.appKey = 'app-key';
      dto.name = 'Test API Key';
      dto.totalRequestCount = 1000;
      dto.todayRequests = 50;
      dto.hourlyRequests = 10;
      dto.successfulRequests = 950;
      dto.failedRequests = 50;
      dto.averageResponseTimeMs = 150;
      dto.lastAccessedAt = new Date();
      dto.createdAt = new Date();

      // Assert
      expect(dto).toBeDefined();
      expect(dto.apiKeyId).toBe('apikey123');
      expect(dto.appKey).toBe('app-key');
      expect(dto.name).toBe('Test API Key');
      expect(dto.totalRequestCount).toBe(1000);
      expect(dto.todayRequests).toBe(50);
      expect(dto.hourlyRequests).toBe(10);
      expect(dto.successfulRequests).toBe(950);
      expect(dto.failedRequests).toBe(50);
      expect(dto.averageResponseTimeMs).toBe(150);
    });
  });

  describe('UserDetailedStatsDto', () => {
    it('应该成功创建有效的用户详细统计DTO', () => {
      // Arrange & Act
      const dto = new UserDetailedStatsDto();
      dto.userId = 'user123';
      dto.username = 'testuser';
      dto.role = 'DEVELOPER';
      dto.totalApiKeys = 5;
      dto.activeApiKeys = 3;
      dto.totalRequestCount = 10000;
      dto.todayRequests = 100;
      dto.successfulRequests = 9500;
      dto.failedRequests = 500;
      dto.lastAccessedAt = new Date();
      dto.createdAt = new Date();

      // Assert
      expect(dto).toBeDefined();
      expect(dto.userId).toBe('user123');
      expect(dto.username).toBe('testuser');
      expect(dto.role).toBe('DEVELOPER');
      expect(dto.totalApiKeys).toBe(5);
      expect(dto.activeApiKeys).toBe(3);
      expect(dto.totalRequestCount).toBe(10000);
      expect(dto.todayRequests).toBe(100);
      expect(dto.successfulRequests).toBe(9500);
      expect(dto.failedRequests).toBe(500);
    });
  });
});