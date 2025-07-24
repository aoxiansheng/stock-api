/**
 * ApiKeyRepository 单元测试
 * 测试API密钥数据访问层的所有方法
 */

import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ApiKeyRepository } from "../../../../../src/auth/repositories/apikey.repository";
import {
  ApiKey,
  ApiKeyDocument,
} from "../../../../../src/auth/schemas/apikey.schema";
import { Permission } from "../../../../../src/auth/enums/user-role.enum";

describe("ApiKeyRepository", () => {
  let repository: ApiKeyRepository;
  let apiKeyModel: any;

  const mockApiKey = {
    id: "507f1f77bcf86cd799439011",
    appKey: "test-app-key-123",
    accessToken: "test-access-token-456",
    name: "Test API Key",
    permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    rateLimit: {
      requests: 1000,
      window: "1h",
    },
    isActive: true,
    usageCount: 10,
    lastUsedAt: new Date("2024-01-15T10:00:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
  };

  const mockInactiveApiKey = {
    ...mockApiKey,
    id: "507f1f77bcf86cd799439012",
    appKey: "inactive-app-key-123",
    accessToken: "inactive-access-token-456",
    name: "Inactive API Key",
    isActive: false,
  };

  beforeEach(async () => {
    const mockApiKeyModel = {
      find: jest.fn(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyRepository,
        {
          provide: getModelToken(ApiKey.name),
          useValue: mockApiKeyModel,
        },
      ],
    }).compile();

    repository = module.get<ApiKeyRepository>(ApiKeyRepository);
    apiKeyModel = module.get(getModelToken(ApiKey.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAllActive", () => {
    it("应该返回所有活跃的API Key", async () => {
      // Arrange
      const mockActiveKeys = [
        mockApiKey,
        { ...mockApiKey, id: "507f1f77bcf86cd799439013" },
      ];
      const mockExec = jest.fn().mockResolvedValue(mockActiveKeys);

      apiKeyModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findAllActive();

      // Assert
      expect(apiKeyModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockExec).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockActiveKeys);
      expect(result).toHaveLength(2);
    });

    it("应该在没有活跃API Key时返回空数组", async () => {
      // Arrange
      const mockExec = jest.fn().mockResolvedValue([]);

      apiKeyModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findAllActive();

      // Assert
      expect(apiKeyModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("应该只查询isActive为true的API Key", async () => {
      // Arrange
      const mockExec = jest.fn().mockResolvedValue([mockApiKey]);

      apiKeyModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      await repository.findAllActive();

      // Assert
      expect(apiKeyModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(apiKeyModel.find).toHaveBeenCalledTimes(1);
    });

    it("应该返回完整的API Key文档信息", async () => {
      // Arrange
      const mockActiveKey = {
        ...mockApiKey,
        description: "Test description",
        expiresAt: new Date("2024-12-31T23:59:59Z"),
        userId: "507f1f77bcf86cd799439020",
      };
      const mockExec = jest.fn().mockResolvedValue([mockActiveKey]);

      apiKeyModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findAllActive();

      // Assert
      expect(result[0]).toMatchObject({
        id: mockActiveKey.id,
        appKey: mockActiveKey.appKey,
        accessToken: mockActiveKey.accessToken,
        name: mockActiveKey.name,
        permissions: mockActiveKey.permissions,
        rateLimit: mockActiveKey.rateLimit,
        isActive: true,
        usageCount: mockActiveKey.usageCount,
        lastUsedAt: mockActiveKey.lastUsedAt,
        description: mockActiveKey.description,
        expiresAt: mockActiveKey.expiresAt,
        userId: mockActiveKey.userId,
      });
    });

    it("应该处理数据库查询错误", async () => {
      // Arrange
      const mockError = new Error("Database connection failed");
      const mockExec = jest.fn().mockRejectedValue(mockError);

      apiKeyModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act & Assert
      await expect(repository.findAllActive()).rejects.toThrow(
        "Database connection failed",
      );
      expect(apiKeyModel.find).toHaveBeenCalledWith({ isActive: true });
    });

    it("应该返回不同权限配置的API Key", async () => {
      // Arrange
      const mockKeyWithDifferentPermissions = {
        ...mockApiKey,
        id: "507f1f77bcf86cd799439014",
        permissions: [Permission.DATA_READ, Permission.PROVIDERS_READ],
      };
      const mockActiveKeys = [mockApiKey, mockKeyWithDifferentPermissions];
      const mockExec = jest.fn().mockResolvedValue(mockActiveKeys);

      apiKeyModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findAllActive();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].permissions).toEqual([
        Permission.DATA_READ,
        Permission.QUERY_EXECUTE,
      ]);
      expect(result[1].permissions).toEqual([
        Permission.DATA_READ,
        Permission.PROVIDERS_READ,
      ]);
    });

    it("应该返回不同速率限制配置的API Key", async () => {
      // Arrange
      const mockKeyWithDifferentRateLimit = {
        ...mockApiKey,
        id: "507f1f77bcf86cd799439015",
        rateLimit: {
          requests: 5000,
          window: "1d",
        },
      };
      const mockActiveKeys = [mockApiKey, mockKeyWithDifferentRateLimit];
      const mockExec = jest.fn().mockResolvedValue(mockActiveKeys);

      apiKeyModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act
      const result = await repository.findAllActive();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].rateLimit).toEqual({ requests: 1000, window: "1h" });
      expect(result[1].rateLimit).toEqual({ requests: 5000, window: "1d" });
    });
  });
});
