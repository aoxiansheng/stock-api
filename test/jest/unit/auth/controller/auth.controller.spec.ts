/**
 * AuthController 单元测试
 * 测试认证控制器的API端点，所有依赖服务均为Mock
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { AuthController } from "../../../../../src/auth/controller/auth.controller";
import { AuthService } from "../../../../../src/auth/services/auth.service";
import { CreateUserDto, LoginDto } from "../../../../../src/auth/dto/auth.dto";
import { CreateApiKeyDto } from "../../../../../src/auth/dto/apikey.dto";
import { UserRole } from "../../../../../src/auth/enums/user-role.enum";
import { Permission } from "../../../../../src/auth/enums/user-role.enum";
import { PermissionService } from "../../../../../src/auth/services/permission.service";
import { RateLimitService } from "../../../../../src/auth/services/rate-limit.service";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  // Mock 数据 - 不包含敏感字段，模拟toJSON()方法的输出
  const mockUser = {
    id: "507f1f77bcf86cd799439011",
    username: "testuser",
    email: "test@example.com",
    role: UserRole.DEVELOPER,
    isActive: true,
    lastLoginAt: new Date("2024-01-01T11:_30:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  } as any;

  const mockLoginResponse = {
    user: mockUser,
    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  };

  const mockApiKey = {
    id: "507f1f77bcf86cd799439012",
    name: "Test API Key",
    appKey: "ak_test_12345",
    accessToken: "sk_test_secret_token",
    userId: "507f1f77bcf86cd799439011",
    permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    rateLimit: {
      requests: 1000,
      window: "1h",
    },
    isActive: true,
    usageCount: 100,
    lastUsedAt: new Date("2024-01-01T11:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  const mockRequest = {
    user: mockUser,
  } as any as Request;

  beforeEach(async () => {
    // Mock AuthService
    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      createApiKey: jest.fn(),
      getUserApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
      validateApiKey: jest.fn(),
      refreshToken: jest.fn(),
      getAllUsers: jest.fn().mockImplementation((page = 1, limit = 10) => {
        return {
          users: [],
          total: 0,
          page: page || 1,
          limit: limit || 10,
          stats: {
            totalUsers: 0,
            activeUsers: 0,
            inactiveUsers: 0,
            roleDistribution: {},
          },
        };
      }),
    };

    // Mock PermissionService
    const mockPermissionService = {
      checkPermissions: jest.fn().mockResolvedValue({
        allowed: true,
        missingPermissions: [],
        missingRoles: [],
        duration: 10,
        details: "Access granted",
      }),
      getEffectivePermissions: jest
        .fn()
        .mockReturnValue([Permission.DATA_READ, Permission.QUERY_EXECUTE]),
      combinePermissions: jest.fn().mockReturnValue([Permission.DATA_READ]),
      createPermissionContext: jest.fn().mockResolvedValue({
        subject: mockUser,
        requiredPermissions: [],
        requiredRoles: [],
        grantedPermissions: [Permission.DATA_READ],
        hasAccess: true,
        details: {
          missingPermissions: [],
          timestamp: new Date(),
          duration: 10,
        },
      }),
      invalidateCacheFor: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Reflector
    const mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndOverride: jest.fn().mockReturnValue([]),
      getAllAndMerge: jest.fn(),
    };

    // Mock RateLimitService
    const mockRateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue({
        allowed: true,
        limit: 1000,
        current: 1,
        remaining: 999,
        resetTime: Date.now() + 3600000,
        retryAfter: undefined,
      }),
      getCurrentUsage: jest.fn().mockResolvedValue({
        current: 1,
        limit: 1000,
        remaining: 999,
        resetTime: Date.now() + 3600000,
      }),
      resetRateLimit: jest.fn().mockResolvedValue(undefined),
      getUsageStatistics: jest.fn().mockResolvedValue({
        totalRequests: 100,
        currentPeriodRequests: 1,
        lastRequestTime: new Date(),
        averageRequestsPerHour: 10,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    // Mock Logger to avoid console output in tests
    jest.spyOn(Logger.prototype, "log").mockImplementation();
    jest.spyOn(Logger.prototype, "error").mockImplementation();
    jest.spyOn(Logger.prototype, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    const createUserDto: CreateUserDto = {
      username: "newuser",
      email: "newuser@example.com",
      password: "password123",
      role: UserRole.DEVELOPER,
    };

    it("should register a new user successfully", async () => {
      // Arrange
      authService.register.mockResolvedValue(mockUser);

      // Act
      const result = await controller.register(createUserDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it("should handle registration errors", async () => {
      // Arrange
      const error = new Error("用户名已存在");
      authService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.register(createUserDto)).rejects.toThrow(
        "用户名已存在",
      );
      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });

    it("should register user with minimum required fields", async () => {
      // Arrange
      const minimalUserDto = {
        username: "minimaluser",
        email: "minimal@example.com",
        password: "password123",
      };
      const createdUser = {
        ...mockUser,
        username: "minimaluser",
        email: "minimal@example.com",
      } as any;
      authService.register.mockResolvedValue(createdUser);

      // Act
      const result = await controller.register(minimalUserDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(minimalUserDto);
      expect(result).toEqual(createdUser);
    });
  });

  describe("login", () => {
    const loginDto: LoginDto = {
      username: "testuser",
      password: "password123",
    };

    it("should login user successfully", async () => {
      // Arrange
      authService.login.mockResolvedValue(mockLoginResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockLoginResponse);
      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should handle invalid credentials", async () => {
      // Arrange
      const error = new Error("用户名或密码错误");
      authService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(
        "用户名或密码错误",
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it("should handle inactive user login attempt", async () => {
      // Arrange
      const error = new Error("用户账号已被禁用");
      authService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(
        "用户账号已被禁用",
      );
    });
  });

  describe("getProfile", () => {
    it("should return current user profile", async () => {
      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it("should handle request without user", async () => {
      // Arrange
      const requestWithoutUser = {} as any as Request;

      // Act
      const result = await controller.getProfile(requestWithoutUser);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("createApiKey", () => {
    const createApiKeyDto: CreateApiKeyDto = {
      name: "My API Key",
      permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
      rateLimit: {
        requests: 1000,
        window: "1h",
      },
    };

    it("should create API key successfully", async () => {
      // Arrange
      authService.createApiKey.mockResolvedValue(mockApiKey);

      // Act
      const result = await controller.createApiKey(
        mockRequest,
        createApiKeyDto,
      );

      // Assert
      expect(authService.createApiKey).toHaveBeenCalledWith(
        mockUser.id,
        createApiKeyDto,
      );
      expect(result).toEqual(mockApiKey);
    });

    it("should create API key with minimal permissions", async () => {
      // Arrange
      const minimalApiKeyDto: CreateApiKeyDto = {
        name: "Read Only Key",
        permissions: [Permission.DATA_READ],
      };
      const readOnlyApiKey = {
        ...mockApiKey,
        name: "Read Only Key",
        permissions: [Permission.DATA_READ],
      };
      authService.createApiKey.mockResolvedValue(readOnlyApiKey);

      // Act
      const result = await controller.createApiKey(
        mockRequest,
        minimalApiKeyDto,
      );

      // Assert
      expect(authService.createApiKey).toHaveBeenCalledWith(
        mockUser.id,
        minimalApiKeyDto,
      );
      expect(result).toEqual(readOnlyApiKey);
    });

    it("should handle API key creation failure", async () => {
      // Arrange
      const error = new Error("API Key 创建失败");
      authService.createApiKey.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.createApiKey(mockRequest, createApiKeyDto),
      ).rejects.toThrow("API Key 创建失败");
    });

    it("should create API key with custom expiration", async () => {
      // Arrange
      const expiringApiKeyDto: CreateApiKeyDto = {
        name: "Expiring Key",
        permissions: [Permission.DATA_READ],
        expiresAt: new Date("2024-12-31T23:59:59.000Z"),
      };
      const expiringApiKey = {
        ...mockApiKey,
        expiresAt: new Date("2024-12-31T23:59:59.000Z"),
      };
      authService.createApiKey.mockResolvedValue(expiringApiKey);

      // Act
      const result = await controller.createApiKey(
        mockRequest,
        expiringApiKeyDto,
      );

      // Assert
      expect(authService.createApiKey).toHaveBeenCalledWith(
        mockUser.id,
        expiringApiKeyDto,
      );
      expect(result).toEqual(expiringApiKey);
    });
  });

  describe("getUserApiKeys", () => {
    it("should return user API keys", async () => {
      // Arrange
      const apiKeys = [
        mockApiKey,
        { ...mockApiKey, id: "another-id", name: "Another Key" },
      ];
      authService.getUserApiKeys.mockResolvedValue(apiKeys);

      // Act
      const result = await controller.getUserApiKeys(mockRequest);

      // Assert
      expect(authService.getUserApiKeys).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(apiKeys);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when user has no API keys", async () => {
      // Arrange
      authService.getUserApiKeys.mockResolvedValue([]);

      // Act
      const result = await controller.getUserApiKeys(mockRequest);

      // Assert
      expect(authService.getUserApiKeys).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual([]);
    });

    it("should handle error when fetching API keys", async () => {
      // Arrange
      const error = new Error("获取API Keys失败");
      authService.getUserApiKeys.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getUserApiKeys(mockRequest)).rejects.toThrow(
        "获取API Keys失败",
      );
    });
  });

  describe("revokeApiKey", () => {
    const apiKeyId = "507f1f77bcf86cd799439012";

    it("should revoke API key successfully", async () => {
      // Arrange
      authService.revokeApiKey.mockResolvedValue(undefined);

      // Act
      const result = await controller.revokeApiKey(mockRequest, apiKeyId);

      // Assert
      expect(authService.revokeApiKey).toHaveBeenCalledWith(
        apiKeyId,
        mockUser.id,
      );
      expect(result).toEqual({ success: true });
    });

    it("should handle non-existent API key", async () => {
      // Arrange
      const error = new Error("API Key 不存在或无权限操作");
      authService.revokeApiKey.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.revokeApiKey(mockRequest, "non-existent-id"),
      ).rejects.toThrow("API Key 不存在或无权限操作");
    });

    it("should handle revocation of already revoked key", async () => {
      // Arrange
      const error = new Error("API Key 已被撤销");
      authService.revokeApiKey.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.revokeApiKey(mockRequest, apiKeyId),
      ).rejects.toThrow("API Key 已被撤销");
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle validation errors gracefully", async () => {
      // Arrange
      const invalidUserDto = {
        username: "", // 空用户名应该失败
        email: "invalid-email", // 无效邮箱格式
        password: "123", // 密码太短
      };

      // Note: ValidationPipe会在实际应用中处理这些错误
      // 这里我们测试控制器对验证错误的响应
      const validationError = new Error("验证失败");
      authService.register.mockRejectedValue(validationError);

      // Act & Assert
      await expect(controller.register(invalidUserDto as any)).rejects.toThrow(
        "验证失败",
      );
    });

    it("should handle service unavailable errors", async () => {
      // Arrange
      const serviceError = new Error("服务暂时不可用");
      authService.login.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        controller.login({ username: "test", password: "test" }),
      ).rejects.toThrow("服务暂时不可用");
    });

    it("should handle malformed request data", async () => {
      // Arrange
      const malformedData = { invalidField: "value" };
      const error = new Error("请求数据格式错误");
      authService.register.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.register(malformedData as any)).rejects.toThrow(
        "请求数据格式错误",
      );
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete user workflow", async () => {
      // Arrange
      const userDto: CreateUserDto = {
        username: "workflowuser",
        email: "workflow@example.com",
        password: "securepassword",
        role: UserRole.DEVELOPER,
      };
      const loginDto: LoginDto = {
        username: "workflowuser",
        password: "securepassword",
      };
      const apiKeyDto: CreateApiKeyDto = {
        name: "Workflow API Key",
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
      };

      const workflowUser = {
        ...mockUser,
        username: "workflowuser",
        email: "workflow@example.com",
      } as any;
      const workflowLoginResponse = {
        ...mockLoginResponse,
        user: workflowUser,
      } as any;
      const workflowRequest = { user: workflowUser } as any as Request;

      authService.register.mockResolvedValue(workflowUser);
      authService.login.mockResolvedValue(workflowLoginResponse);
      authService.createApiKey.mockResolvedValue(mockApiKey);
      authService.getUserApiKeys.mockResolvedValue([mockApiKey]);

      // Act & Assert
      // 1. 注册用户
      const registeredUser = await controller.register(userDto);
      expect(registeredUser).toEqual(workflowUser);

      // 2. 用户登录
      const loginResult = await controller.login(loginDto);
      expect(loginResult).toEqual(workflowLoginResponse);

      // 3. 获取用户信息
      const profile = await controller.getProfile(workflowRequest);
      expect(profile).toEqual(workflowUser);

      // 4. 创建API Key
      const apiKey = await controller.createApiKey(workflowRequest, apiKeyDto);
      expect(apiKey).toEqual(mockApiKey);

      // 5. 获取用户的API Keys
      const apiKeys = await controller.getUserApiKeys(workflowRequest);
      expect(apiKeys).toContain(mockApiKey);
    });

    it("should handle concurrent API key operations", async () => {
      // Arrange
      const apiKeyPromises = Array.from({ length: 3 }, (_, i) => {
        const dto: CreateApiKeyDto = {
          name: `Concurrent Key ${i + 1}`,
          permissions: [Permission.DATA_READ],
        };
        const apiKey = {
          ...mockApiKey,
          id: `key-${i + 1}`,
          name: `Concurrent Key ${i + 1}`,
        };
        authService.createApiKey.mockResolvedValueOnce(apiKey);
        return controller.createApiKey(mockRequest, dto);
      });

      // Act
      const results = await Promise.all(apiKeyPromises);

      // Assert
      expect(results).toHaveLength(3);
      expect(authService.createApiKey).toHaveBeenCalledTimes(3);
      results.forEach((result, index) => {
        expect(result.name).toBe(`Concurrent Key ${index + 1}`);
      });
    });
  });

  describe("getAllUsers", () => {
    it("should return paginated user list with default parameters", async () => {
      // Act
      const result = await controller.getAllUsers();

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        stats: {
          activeUsers: 0,
          inactiveUsers: 0,
          roleDistribution: {},
          totalUsers: 0,
        },
      });
    });

    it("should return paginated user list with custom parameters", async () => {
      // Act
      const result = await controller.getAllUsers(2, 20);

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
        page: 2,
        limit: 20,
        stats: {
          activeUsers: 0,
          inactiveUsers: 0,
          roleDistribution: {},
          totalUsers: 0,
        },
      });
    });

    it("should handle page parameter as undefined", async () => {
      // Act
      const result = await controller.getAllUsers(undefined, 15);

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 15,
        stats: {
          activeUsers: 0,
          inactiveUsers: 0,
          roleDistribution: {},
          totalUsers: 0,
        },
      });
    });

    it("should handle limit parameter as undefined", async () => {
      // Act
      const result = await controller.getAllUsers(3, undefined);

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
        page: 3,
        limit: 10,
        stats: {
          activeUsers: 0,
          inactiveUsers: 0,
          roleDistribution: {},
          totalUsers: 0,
        },
      });
    });

    it("should handle both parameters as undefined", async () => {
      // Act
      const result = await controller.getAllUsers(undefined, undefined);

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        stats: {
          activeUsers: 0,
          inactiveUsers: 0,
          roleDistribution: {},
          totalUsers: 0,
        },
      });
    });
  });

  describe("getApiKeyUsage", () => {
    const apiKeyId = "507f1f77bcf86cd799439012";

    it("should return usage message for existing API key", async () => {
      // Act
      const result = await controller.getApiKeyUsage(mockRequest, apiKeyId);

      // Assert
      expect(result).toEqual({
        message: "功能开发中，即将上线",
      });
    });

    it("should handle different API key IDs", async () => {
      // Act
      const result1 = await controller.getApiKeyUsage(mockRequest, "key1");
      const result2 = await controller.getApiKeyUsage(mockRequest, "key2");

      // Assert
      expect(result1).toEqual({ message: "功能开发中，即将上线" });
      expect(result2).toEqual({ message: "功能开发中，即将上线" });
    });
  });

  describe("resetApiKeyRateLimit", () => {
    const apiKeyId = "507f1f77bcf86cd799439012";

    it("should reset rate limit successfully", async () => {
      // Act
      const result = await controller.resetApiKeyRateLimit(
        mockRequest,
        apiKeyId,
      );

      // Assert
      expect(result).toEqual({ success: true });
    });

    it("should handle different API key IDs for rate limit reset", async () => {
      // Act
      const result1 = await controller.resetApiKeyRateLimit(
        mockRequest,
        "key1",
      );
      const result2 = await controller.resetApiKeyRateLimit(
        mockRequest,
        "key2",
      );

      // Assert
      expect(result1).toEqual({ success: true });
      expect(result2).toEqual({ success: true });
    });
  });

  describe("security considerations", () => {
    it("should not expose sensitive data in responses", async () => {
      // Arrange
      // 模拟User schema的toJSON方法行为，返回不包含敏感字段的用户对象
      const safeUserData = {
        ...mockUser,
        // 不包含敏感字段：passwordHash 和 refreshToken
      } as any;
      authService.register.mockResolvedValue(safeUserData);

      // Act
      const result = await controller.register({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

      // Assert
      expect(result).not.toHaveProperty("passwordHash");
      expect(result).not.toHaveProperty("refreshToken");
    });

    it("should handle rate limiting scenarios", async () => {
      // Arrange
      const rateLimitError = new Error("请求过于频繁，请稍后再试");
      authService.login.mockRejectedValue(rateLimitError);

      // Act & Assert
      await expect(
        controller.login({ username: "test", password: "test" }),
      ).rejects.toThrow("请求过于频繁，请稍后再试");
    });

    it("should validate API key permissions properly", async () => {
      // Arrange
      const restrictedApiKeyDto: CreateApiKeyDto = {
        name: "Restricted Key",
        permissions: [], // 空权限应该使用默认权限
      };
      const restrictedApiKey = {
        ...mockApiKey,
        permissions: [Permission.DATA_READ],
      };
      authService.createApiKey.mockResolvedValue(restrictedApiKey);

      // Act
      const result = await controller.createApiKey(
        mockRequest,
        restrictedApiKeyDto,
      );

      // Assert
      expect(result.permissions).toContain(Permission.DATA_READ);
      expect(authService.createApiKey).toHaveBeenCalledWith(
        mockUser.id,
        restrictedApiKeyDto,
      );
    });
  });
});
