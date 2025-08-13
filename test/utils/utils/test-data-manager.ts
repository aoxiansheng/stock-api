/**
 * 测试数据管理工具
 * 提供测试数据的创建、隔离和清理功能
 */

import { getModelToken } from "@nestjs/mongoose";
import { INestApplication } from "@nestjs/common";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { AuthService } from "../../../src/auth/services/auth.service";
import { JwtService } from "@nestjs/jwt";
import { UserRole, Permission } from "../../../src/auth/enums/user-role.enum";
import * as request from "supertest";

export interface TestUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface TestApiKey {
  id: string;
  name: string;
  key: string;
  secret: string;
  permissions: Permission[];
}

export class TestDataManager {
  private readonly testDataPrefix: string;
  private readonly createdUsers: TestUser[] = [];
  private readonly createdApiKeys: TestApiKey[] = [];
  private readonly createdRedisKeys: string[] = [];

  constructor(
    private readonly app: INestApplication,
    private readonly testPrefix?: string,
  ) {
    this.testDataPrefix =
      testPrefix ||
      `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建测试用户
   */
  async createTestUser(
    userData: {
      username?: string;
      email?: string;
      password?: string;
      role?: UserRole;
    } = {},
  ): Promise<TestUser> {
    const authService = this.app.get<AuthService>(AuthService);
    const jwtService = this.app.get<JwtService>(JwtService);

    const userDefaults = {
      username: `${this.testDataPrefix}_user_${this.createdUsers.length + 1}`,
      email: `${this.testDataPrefix}_user_${this.createdUsers.length + 1}@test.com`,
      password: "password123",
      role: UserRole.DEVELOPER,
    };

    const userInfo = { ...userDefaults, ...userData };

    const user = await authService.register(userInfo);
    const token = jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    const testUser: TestUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token,
    };

    this.createdUsers.push(testUser);
    return testUser;
  }

  /**
   * 创建管理员用户
   */
  async createAdminUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    return this.createTestUser({
      ...userData,
      role: UserRole.ADMIN,
    });
  }

  /**
   * 创建开发者用户
   */
  async createDeveloperUser(
    userData: Partial<TestUser> = {},
  ): Promise<TestUser> {
    return this.createTestUser({
      ...userData,
      role: UserRole.DEVELOPER,
    });
  }

  /**
   * 创建API Key
   */
  async createApiKey(
    userId: string,
    apiKeyData: {
      name?: string;
      permissions?: Permission[];
    } = {},
  ): Promise<TestApiKey> {
    const authService = this.app.get<AuthService>(AuthService);

    const apiKeyDefaults = {
      name: `${this.testDataPrefix}_api_key_${this.createdApiKeys.length + 1}`,
      permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    };

    const apiKeyInfo = { ...apiKeyDefaults, ...apiKeyData };

    const apiKey = await authService.createApiKey(userId, apiKeyInfo);

    const testApiKey: TestApiKey = {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.appKey,
      secret: apiKey.accessToken,
      permissions: apiKey.permissions,
    };

    this.createdApiKeys.push(testApiKey);
    return testApiKey;
  }

  /**
   * 通过HTTP请求创建API Key
   */
  async createApiKeyViaHttp(
    userToken: string,
    apiKeyData: {
      name?: string;
      permissions?: Permission[];
    } = {},
  ): Promise<TestApiKey> {
    const httpServer = this.app.getHttpServer();

    const apiKeyDefaults = {
      name: `${this.testDataPrefix}_api_key_${this.createdApiKeys.length + 1}`,
      permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
    };

    const apiKeyInfo = { ...apiKeyDefaults, ...apiKeyData };

    const response = await request(httpServer)
      .post("/api/v1/auth/api-keys")
      .set("Authorization", `Bearer ${userToken}`)
      .send(apiKeyInfo);

    if (response.status !== 201) {
      throw new Error(`Failed to create API key: ${response.body.message}`);
    }

    const createdApiKeyData = response.body.data;
    const testApiKey: TestApiKey = {
      id: createdApiKeyData.id,
      name: createdApiKeyData.name,
      key: createdApiKeyData.key,
      secret: createdApiKeyData.secret,
      permissions: createdApiKeyData.permissions,
    };

    this.createdApiKeys.push(testApiKey);
    return testApiKey;
  }

  /**
   * 设置Redis测试数据
   */
  async setRedisData(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const redisService = this.app.get<RedisService>(RedisService);
      const redisClient = redisService.getOrThrow();

      const testKey = `${this.testDataPrefix}:${key}`;

      if (typeof value === "object") {
        await redisClient.set(testKey, JSON.stringify(value));
      } else {
        await redisClient.set(testKey, value);
      }

      if (ttl) {
        await redisClient.expire(testKey, ttl);
      }

      this.createdRedisKeys.push(testKey);
    } catch (error) {
      console.warn("设置Redis测试数据失败:", error.message);
    }
  }

  /**
   * 获取Redis测试数据
   */
  async getRedisData(key: string): Promise<any> {
    try {
      const redisService = this.app.get<RedisService>(RedisService);
      const redisClient = redisService.getOrThrow();

      const testKey = `${this.testDataPrefix}:${key}`;
      const value = await redisClient.get(testKey);

      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      console.warn("获取Redis测试数据失败:", error.message);
      return null;
    }
  }

  /**
   * 清理所有测试数据
   */
  async cleanup(): Promise<void> {
    const errors: Error[] = [];

    // 清理数据库数据
    try {
      await this.cleanupDatabaseData();
    } catch (error) {
      errors.push(error);
    }

    // 清理Redis数据
    try {
      await this.cleanupRedisData();
    } catch (error) {
      errors.push(error);
    }

    // 清理内存数据
    this.createdUsers.length = 0;
    this.createdApiKeys.length = 0;
    this.createdRedisKeys.length = 0;

    if (errors.length > 0) {
      console.error("测试数据清理时出现错误:", errors);
    }
  }

  /**
   * 清理数据库数据
   */
  private async cleanupDatabaseData(): Promise<void> {
    const userModel = this.app.get(getModelToken("User"), { strict: false });
    const apiKeyModel = this.app.get(getModelToken("ApiKey"), {
      strict: false,
    });
    const symbolMappingModel = this.app.get(
      getModelToken("SymbolMappingRule"),
      { strict: false },
    );
    const dataMappingModel = this.app.get(getModelToken("DataMappingRule"), {
      strict: false,
    });
    const storageModel = this.app.get(getModelToken("StoredData"), {
      strict: false,
    });

    const cleanupTasks = [];

    // 清理用户数据
    if (userModel) {
      cleanupTasks.push(
        userModel.deleteMany({
          username: { $regex: `^${this.testDataPrefix}_` },
        }),
      );
    }

    // 清理API Key数据
    if (apiKeyModel) {
      cleanupTasks.push(
        apiKeyModel.deleteMany({
          name: { $regex: `^${this.testDataPrefix}_` },
        }),
      );
    }

    // 清理其他测试数据
    if (symbolMappingModel) {
      cleanupTasks.push(
        symbolMappingModel.deleteMany({
          dataSourceName: { $regex: `^${this.testDataPrefix}_` },
        }),
      );
    }

    if (dataMappingModel) {
      cleanupTasks.push(
        dataMappingModel.deleteMany({
          name: { $regex: `^${this.testDataPrefix}_` },
        }),
      );
    }

    if (storageModel) {
      cleanupTasks.push(
        storageModel.deleteMany({
          requestId: { $regex: `^${this.testDataPrefix}_` },
        }),
      );
    }

    await Promise.all(cleanupTasks);
  }

  /**
   * 清理Redis数据
   */
  private async cleanupRedisData(): Promise<void> {
    try {
      const redisService = this.app.get<RedisService>(RedisService);
      const redisClient = redisService.getOrThrow();

      if (this.createdRedisKeys.length > 0) {
        await redisClient.del(...this.createdRedisKeys);
      }

      // 清理所有带有测试前缀的键
      const testKeys = await redisClient.keys(`${this.testDataPrefix}:*`);
      if (testKeys.length > 0) {
        await redisClient.del(...testKeys);
      }
    } catch (error) {
      console.warn("清理Redis测试数据失败:", error.message);
    }
  }

  /**
   * 获取测试数据统计
   */
  getStats(): {
    prefix: string;
    users: number;
    apiKeys: number;
    redisKeys: number;
  } {
    return {
      prefix: this.testDataPrefix,
      users: this.createdUsers.length,
      apiKeys: this.createdApiKeys.length,
      redisKeys: this.createdRedisKeys.length,
    };
  }

  /**
   * 获取所有创建的用户
   */
  getUsers(): TestUser[] {
    return [...this.createdUsers];
  }

  /**
   * 获取所有创建的API Key
   */
  getApiKeys(): TestApiKey[] {
    return [...this.createdApiKeys];
  }

  /**
   * 获取测试数据前缀
   */
  getTestDataPrefix(): string {
    return this.testDataPrefix;
  }

  /**
   * 等待异步操作完成
   */
  async waitForAsyncOperations(timeout: number = 100): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, timeout));
  }
}

/**
 * 创建测试数据管理器的工厂函数
 */
export function createTestDataManager(
  app: INestApplication,
  testPrefix?: string,
): TestDataManager {
  return new TestDataManager(app, testPrefix);
}

/**
 * 全局测试数据管理器实例
 */
export const GlobalTestDataManager = {
  current: null as TestDataManager | null,

  initialize(app: INestApplication, testPrefix?: string): TestDataManager {
    this.current = new TestDataManager(app, testPrefix);
    return this.current;
  },

  async cleanup(): Promise<void> {
    if (this.current) {
      await this.current.cleanup();
      this.current = null;
    }
  },

  getInstance(): TestDataManager | null {
    return this.current;
  },
};
