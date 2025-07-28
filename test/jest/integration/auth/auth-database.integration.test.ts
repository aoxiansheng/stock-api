/**
 * Auth模块数据库集成测试
 * 测试认证服务与MongoDB和Redis的真实交互
 */

import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcrypt";

import { AuthService } from "../../../../src/auth/services/auth.service";
import { RateLimitService } from "../../../../src/auth/services/rate-limit.service";
import { TokenService } from "../../../../src/auth/services/token.service";
import { UserRole } from "../../../../src/auth/enums/user-role.enum";
import { Permission } from "../../../../src/auth/enums/user-role.enum";
import { RateLimitStrategy } from "../../../../src/common/constants/rate-limit.constants";

describe("Auth Database Integration", () => {
  let app: INestApplication;
  let authService: AuthService;
  let rateLimitService: RateLimitService;
  let tokenService: TokenService;
  let userModel: Model<any>;
  let apiKeyModel: Model<any>;

  beforeAll(() => {
    app = (global as any).testApp;
    authService = app.get<AuthService>(AuthService);
    rateLimitService = app.get<RateLimitService>(RateLimitService);
    tokenService = app.get<TokenService>(TokenService);
    userModel = app.get(getModelToken("User"));
    apiKeyModel = app.get(getModelToken("ApiKey"));
  });

  describe("User Registration and Login Flow", () => {
    let testUser: any;

    // 在每个测试用例前都创建一个新用户，确保测试独立性
    beforeEach(async () => {
      const userData = {
        username: `testuser-${Date.now()}`,
        email: `test-${Date.now()}@test.com`,
        password: "securepassword123",
        role: UserRole.DEVELOPER,
      };
      testUser = await authService.register(userData);
    });

    it("应该成功注册新用户", async () => {
      // beforeEach已经完成了注册，这里只需验证结果
      expect(testUser).toBeDefined();
      expect(testUser.username).toContain("testuser-");
      expect(testUser.email).toContain("@test.com");
      expect(testUser.role).toBe(UserRole.DEVELOPER);
      expect(testUser.isActive).toBe(true);
      expect(testUser).not.toHaveProperty("passwordHash");
      expect(testUser.id).toBeDefined();
    });

    it("应该成功登录注册的用户", async () => {
      // Arrange
      const loginData = {
        username: testUser.username,
        password: "securepassword123",
      };

      // Act
      const loginResult = await authService.login(loginData);

      // Assert
      expect(loginResult).toBeDefined();
      expect(loginResult.user).toBeDefined();
      expect(loginResult.accessToken).toBeDefined();
      expect(loginResult.refreshToken).toBeDefined();
      expect(loginResult.user.username).toBe(loginData.username);
      expect(loginResult.user).not.toHaveProperty("passwordHash");
    });

    it("应该成功验证JWT令牌", async () => {
      // Arrange: 先登录获取令牌
      await authService.login({
        username: testUser.username,
        password: "securepassword123",
      });
      const jwtPayload = {
        sub: testUser.id,
        username: testUser.username,
        role: testUser.role,
      };

      // Act
      const validatedUser: any =
        await tokenService.validateUserFromPayload(jwtPayload);

      // Assert
      expect(validatedUser).toBeDefined();
      expect(validatedUser.username).toBe(testUser.username);
      expect(validatedUser.id).toBe(testUser.id);
      expect(validatedUser).not.toHaveProperty("passwordHash");
    });

    it("密码应该被正确加密存储", async () => {
      // Arrange: 直接从数据库查询 beforeEach 创建的用户
      const dbUser = await userModel.findOne({ username: testUser.username });

      // Assert
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).toBeDefined();
      expect(dbUser.passwordHash).not.toBe("securepassword123");

      // 验证密码哈希是否正确
      const isPasswordValid = await bcrypt.compare(
        "securepassword123",
        dbUser.passwordHash,
      );
      expect(isPasswordValid).toBe(true);

      // 验证错误密码
      const isWrongPasswordValid = await bcrypt.compare(
        "wrongpassword",
        dbUser.passwordHash,
      );
      expect(isWrongPasswordValid).toBe(false);
    });
  });

  describe("API Key Management Flow", () => {
    let testUser: any;
    let apiKey: any;

    // 在每个测试用例前都创建一个新用户和新API Key
    beforeEach(async () => {
      // 1. 创建测试用户
      const userData = {
        username: `apikeyuser-${Date.now()}`,
        email: `apikey-${Date.now()}@test.com`,
        password: "password123",
        role: UserRole.DEVELOPER,
      };
      testUser = await authService.register(userData);

      // 2. 创建测试API Key
      const apiKeyData = {
        name: "Integration Test API Key",
        permissions: [
          Permission.DATA_READ,
          Permission.QUERY_EXECUTE,
          Permission.PROVIDERS_READ,
        ],
        rateLimit: {
          requests: 500,
          window: "1h",
        },
      };
      apiKey = await authService.createApiKey(testUser.id, apiKeyData);
    });

    it("应该成功创建API Key", async () => {
      // beforeEach已经完成了创建，这里只需验证结果
      expect(apiKey).toBeDefined();
      expect(apiKey.name).toBe("Integration Test API Key");
      expect(apiKey.permissions).toEqual([
        Permission.DATA_READ,
        Permission.QUERY_EXECUTE,
        Permission.PROVIDERS_READ,
      ]);
      expect(apiKey.rateLimit.requests).toBe(500);
      expect(apiKey.appKey).toMatch(/^sk-[0-9a-f-]{36}$/);
      expect(apiKey.accessToken).toMatch(/^[a-zA-Z0-9]{32}$/);
      expect(apiKey.isActive).toBe(true);
      expect(apiKey.usageCount).toBe(0);
    });

    it("应该成功验证API Key", async () => {
      // Act
      const validatedApiKey: any = await authService.validateApiKey(
        apiKey.appKey,
        apiKey.accessToken,
      );

      // Assert
      expect(validatedApiKey).toBeDefined();
      expect(validatedApiKey.id.toString()).toBe(apiKey.id.toString());
      expect(validatedApiKey.appKey).toBe(apiKey.appKey);
    });

    it("应该异步更新API Key使用统计", async () => {
      // Arrange
      const initialUsageCount = apiKey.usageCount;

      // Act
      await authService.validateApiKey(apiKey.appKey, apiKey.accessToken);
      await authService.validateApiKey(apiKey.appKey, apiKey.accessToken);

      // 轮询检查直到异步更新完成
      let updatedApiKey;
      let attempts = 0;
      const maxAttempts = 20;

      do {
        await new Promise((resolve) => setTimeout(resolve, 50));
        updatedApiKey = await apiKeyModel.findById(apiKey.id);
        attempts++;
      } while (
        updatedApiKey.usageCount < initialUsageCount + 2 &&
        attempts < maxAttempts
      );

      // Assert
      expect(updatedApiKey.usageCount).toBe(initialUsageCount + 2);
      expect(updatedApiKey.lastUsedAt).toBeDefined();
    });

    it("应该正确获取用户的API Keys", async () => {
      // Act
      const userApiKeys: any[] = await authService.getUserApiKeys(testUser.id);

      // Assert
      expect(userApiKeys).toBeDefined();
      expect(Array.isArray(userApiKeys)).toBe(true);
      expect(userApiKeys.length).toBe(1);
      expect(userApiKeys[0].id.toString()).toBe(apiKey.id.toString());
    });

    it("应该成功撤销API Key", async () => {
      // Act
      await authService.revokeApiKey(apiKey.appKey, testUser.id);

      // Assert: 验证API Key已被撤销
      await expect(
        authService.validateApiKey(apiKey.appKey, apiKey.accessToken),
      ).rejects.toThrow("API凭证无效");

      // 验证数据库中的状态
      const revokedApiKey = await apiKeyModel.findById(apiKey.id);
      expect(revokedApiKey.isActive).toBe(false);
    });
  });

  describe("Rate Limiting Integration", () => {
    let testApiKey: any;

    beforeAll(async () => {
      // 创建用于限流测试的用户和API Key
      const userData = {
        username: "ratelimituser",
        email: "ratelimit@test.com",
        password: "password123",
      };
      const user: any = await authService.register(userData);

      const apiKeyData = {
        name: "Rate Limit Test Key",
        permissions: [Permission.DATA_READ],
        rateLimit: {
          requests: 5,
          window: "1m", // 1分钟5次请求
        },
      };
      const createdApiKey: any = await authService.createApiKey(
        user.id,
        apiKeyData,
      );

      testApiKey = await apiKeyModel.findById(createdApiKey.id);
    });

    it("应该在限制范围内允许请求", async () => {
      // Act & Assert
      for (let i = 0; i < 5; i++) {
        const result = await rateLimitService.checkRateLimit(testApiKey);
        expect(result.allowed).toBe(true);
        expect(result.current).toBe(i + 1);
        expect(result.remaining).toBe(5 - (i + 1));
      }
    });

    it("应该在超过限制时拒绝请求", async () => {
      // Act
      const result = await rateLimitService.checkRateLimit(testApiKey);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.current).toBe(6);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("应该正确获取当前使用统计", async () => {
      // Act
      const usage = await rateLimitService.getCurrentUsage(
        testApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(usage.current).toBe(6);
      expect(usage.limit).toBe(5);
      expect(usage.remaining).toBe(0);
      expect(usage.resetTime).toBeGreaterThan(Date.now());
    });

    it("应该成功重置限流计数器", async () => {
      // Act
      await rateLimitService.resetRateLimit(
        testApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Verify reset worked
      const result = await rateLimitService.checkRateLimit(testApiKey);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBe(4);
    });

    it("应该正确计算使用统计", async () => {
      // Arrange
      // 先进行几次请求以产生统计数据
      await rateLimitService.checkRateLimit(testApiKey);
      await rateLimitService.checkRateLimit(testApiKey);

      // Act
      const stats = await rateLimitService.getCurrentUsage(
        testApiKey,
        RateLimitStrategy.FIXED_WINDOW,
      );

      // Assert
      expect(stats).toBeDefined();
      expect(stats.current).toBeGreaterThanOrEqual(0);
      expect(stats.limit).toBe(5);
      expect(stats.remaining).toBeGreaterThanOrEqual(0);
      expect(stats.resetTime).toBeGreaterThan(Date.now() - 60000); // Within last minute
    });
  });

  describe("Database Performance and Indexes", () => {
    it("应该快速查找用户（用户名索引）", async () => {
      const startTime = Date.now();

      await tokenService
        .validateUserFromPayload({
          sub: "507f1f77bcf86cd799439011",
          username: "nonexistent",
          role: UserRole.DEVELOPER,
        })
        .catch(() => {}); // 忽略错误，只测试性能

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it("应该快速查找API Key（复合索引）", async () => {
      const startTime = Date.now();

      await authService
        .validateApiKey("nonexistent-key", "nonexistent-token")
        .catch(() => {}); // 忽略错误，只测试性能

      const queryTime = Date.now() - startTime;
      expect(queryTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });

  describe("Error Scenarios", () => {
    it("应该在重复用户名时抛出冲突异常", async () => {
      // Arrange
      const userData1 = {
        username: "duplicateuser",
        email: "duplicate1@test.com",
        password: "password123",
      };
      const userData2 = {
        username: "duplicateuser", // 重复用户名
        email: "duplicate2@test.com",
        password: "password123",
      };

      // Act
      await authService.register(userData1);

      // Assert
      await expect(authService.register(userData2)).rejects.toThrow(
        "用户名或邮箱已存在",
      );
    });

    it("应该在重复邮箱时抛出冲突异常", async () => {
      // Arrange
      const userData1 = {
        username: "user1",
        email: "duplicate@test.com",
        password: "password123",
      };
      const userData2 = {
        username: "user2",
        email: "duplicate@test.com", // 重复邮箱
        password: "password123",
      };

      // Act
      await authService.register(userData1);

      // Assert
      await expect(authService.register(userData2)).rejects.toThrow(
        "用户名或邮箱已存在",
      );
    });

    it("应该在错误的用户ID撤销API Key时抛出异常", async () => {
      // Arrange
      const userData = {
        username: "keyowner",
        email: "keyowner@test.com",
        password: "password123",
      };
      const user: any = await authService.register(userData);

      const apiKeyData = {
        name: "Test Key",
        permissions: [Permission.DATA_READ],
      };
      const apiKey: any = await authService.createApiKey(user.id, apiKeyData);

      // Act & Assert
      await expect(
        authService.revokeApiKey(apiKey.appKey, "wrong-user-id"),
      ).rejects.toThrow("API Key不存在或无权限操作");
    });
  });

  describe("Concurrent Operations", () => {
    it("应该正确处理并发限流请求", async () => {
      // Arrange
      const userData = {
        username: "concurrentuser",
        email: "concurrent@test.com",
        password: "password123",
      };
      const user: any = await authService.register(userData);

      const apiKeyData = {
        name: "Concurrent Test Key",
        permissions: [Permission.DATA_READ],
        rateLimit: {
          requests: 10,
          window: "1m",
        },
      };
      const createdApiKey: any = await authService.createApiKey(
        user.id,
        apiKeyData,
      );

      const apiKey = await apiKeyModel.findById(createdApiKey.id);

      // Act - 同时发送多个请求
      const promises = Array(15)
        .fill(0)
        .map(() => rateLimitService.checkRateLimit(apiKey));
      const results = await Promise.all(promises);

      // Assert
      const allowedCount = results.filter((r) => r.allowed).length;
      const deniedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBeLessThanOrEqual(10); // 最多允许10个
      expect(deniedCount).toBeGreaterThanOrEqual(5); // 至少拒绝5个
      expect(allowedCount + deniedCount).toBe(15);
    });
  });
});
