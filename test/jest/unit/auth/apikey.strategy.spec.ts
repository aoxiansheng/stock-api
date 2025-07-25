/**
 * ApiKeyStrategy 单元测试
 * 测试API Key认证策略的验证逻辑
 */

import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";

import { ApiKeyStrategy } from "../../../../src/auth/strategies/apikey.strategy";
import { AuthService } from "../../../../src/auth/services/auth.service";

describe("ApiKeyStrategy", () => {
  let strategy: ApiKeyStrategy;
  let authService: AuthService;

  const mockApiKey = {
    _id: "507f1f77bcf86cd799439012",
    appKey: "test-app-key",
    accessToken: "test-access-token",
    name: "Test API Key",
    userId: "507f1f77bcf86cd799439011",
    permissions: ["data:read", "query:execute"],
    isActive: true,
    usageCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        {
          provide: AuthService,
          useValue: {
            validateApiKey: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<ApiKeyStrategy>(ApiKeyStrategy);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validate", () => {
    it("应该成功验证有效的API Key凭证", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "test-app-key",
          "x-access-token": "test-access-token",
        },
      } as any;

      authService.validateApiKey = jest.fn().mockResolvedValue(mockApiKey);

      // Act
      const result = await strategy.validate(mockRequest);

      // Assert
      expect(authService.validateApiKey).toHaveBeenCalledWith(
        "test-app-key",
        "test-access-token",
      );
      expect(result).toBe(mockApiKey);
    });

    it("应该在缺少App Key时抛出UnauthorizedException", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-access-token": "test-access-token",
          // 缺少 x-app-key
        },
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "缺少API凭证",
      );
      expect(authService.validateApiKey).not.toHaveBeenCalled();
    });

    it("应该在缺少Access Token时抛出UnauthorizedException", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "test-app-key",
          // 缺少 x-access-token
        },
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "缺少API凭证",
      );
      expect(authService.validateApiKey).not.toHaveBeenCalled();
    });

    it("应该在同时缺少两个凭证时抛出UnauthorizedException", async () => {
      // Arrange
      const mockRequest = {
        headers: {},
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "缺少API凭证",
      );
      expect(authService.validateApiKey).not.toHaveBeenCalled();
    });

    it("应该在App Key为空字符串时抛出UnauthorizedException", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "",
          "x-access-token": "test-access-token",
        },
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "缺少API凭证",
      );
    });

    it("应该在Access Token为空字符串时抛出UnauthorizedException", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "test-app-key",
          "x-access-token": "",
        },
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "缺少API凭证",
      );
    });

    it("应该在AuthService验证失败时抛出UnauthorizedException", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "invalid-key",
          "x-access-token": "invalid-token",
        },
      } as any;

      authService.validateApiKey = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException("API凭证无效"));

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "API凭证无效",
      );
      expect(authService.validateApiKey).toHaveBeenCalledWith(
        "invalid-key",
        "invalid-token",
      );
    });

    it("应该在任何验证错误时抛出统一的UnauthorizedException", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "test-app-key",
          "x-access-token": "test-access-token",
        },
      } as any;

      // 模拟AuthService抛出任意错误
      authService.validateApiKey = jest
        .fn()
        .mockRejectedValue(new Error("数据库连接失败"));

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "API凭证无效",
      );
    });

    it("应该处理大小写不同的头部字段名", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "X-App-Key": "test-app-key",
          "X-Access-Token": "test-access-token",
        },
      } as any; // Express会自动转换为小写

      authService.validateApiKey = jest.fn().mockResolvedValue(mockApiKey);

      // Act
      const result = await strategy.validate(mockRequest);

      // Assert
      expect(result).toBe(mockApiKey);
    });

    it("应该处理数组形式的头部值", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": ["test-app-key"], // 数组形式
          "x-access-token": "test-access-token",
        },
      } as any;

      authService.validateApiKey = jest.fn().mockResolvedValue(mockApiKey);

      // Act
      const result = await strategy.validate(mockRequest);

      // Assert
      expect(authService.validateApiKey).toHaveBeenCalledWith(
        "test-app-key", // 应该提取第一个值
        "test-access-token",
      );
      expect(result).toBe(mockApiKey);
    });

    it("应该拒绝包含空白字符的头部值", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "  test-app-key  ",
          "x-access-token": "  test-access-token  ",
        },
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "API凭证格式无效",
      );
      expect(authService.validateApiKey).not.toHaveBeenCalled();
    });

    it("应该拒绝包含制表符的头部值", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "test\tapp\tkey",
          "x-access-token": "test-access-token",
        },
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "API凭证格式无效",
      );
      expect(authService.validateApiKey).not.toHaveBeenCalled();
    });

    it("应该拒绝包含换行符的头部值", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          "x-app-key": "test-app-key",
          "x-access-token": "test\naccess\ntoken",
        },
      } as any;

      // Act & Assert
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(mockRequest)).rejects.toThrow(
        "API凭证格式无效",
      );
      expect(authService.validateApiKey).not.toHaveBeenCalled();
    });
  });
});
