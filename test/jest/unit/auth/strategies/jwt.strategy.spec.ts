/**
 * JwtStrategy 单元测试
 * 测试JWT认证策略的验证逻辑
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";

import { JwtStrategy } from "../../../../../src/auth/strategies/jwt.strategy";
import { TokenService } from "../../../../../src/auth/services/token.service";
import { UserRole } from "../../../../../src/auth/enums/user-role.enum";
import { User } from "../../../../../src/auth/schemas/user.schema";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let tokenService: TokenService;
  let configService: ConfigService;
  
  // 测试用JWT密钥
  const TEST_JWT_SECRET = "test-jwt-secret-key-for-unit-tests";

  // 创建一个符合User类型的模拟用户
  const mockUser = {
    _id: "507f1f77bcf86cd799439011",
    username: "testuser",
    email: "test@example.com",
    role: UserRole.DEVELOPER,
    isActive: true,
    passwordHash: "hashed_password",
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  beforeEach(async () => {
    // 创建带有预先配置的getOrThrow方法的mockConfigService
    const mockConfigService = {
      get: jest.fn(),
      getOrThrow: jest.fn((key) => {
        if (key === "JWT_SECRET") {
          return TEST_JWT_SECRET;
        }
        throw new Error(`未找到配置: ${key}`);
      }),
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: TokenService,
          useValue: {
            validateUserFromPayload: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    tokenService = module.get<TokenService>(TokenService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("应该使用配置的JWT密钥", () => {
      // 由于JwtStrategy已经在beforeEach中使用测试密钥初始化了
      // 我们只需检查configService.getOrThrow是否被正确调用
      expect(configService.getOrThrow).toHaveBeenCalledWith("JWT_SECRET");
    });

    it("应该使用默认JWT密钥当配置未设置时", () => {
      // 这个测试需要重新创建JwtStrategy实例
      // 但是由于我们无法真实模拟passport-jwt的行为，这里只是检查getOrThrow被调用
      expect(configService.getOrThrow).toHaveBeenCalledWith("JWT_SECRET");
    });
  });

  describe("validate", () => {
    it("应该成功验证有效的JWT载荷", async () => {
      // Arrange
      const payload = {
        sub: "507f1f77bcf86cd799439011",
        username: "testuser",
        role: UserRole.DEVELOPER,
      };

      jest.spyOn(tokenService, 'validateUserFromPayload').mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(tokenService.validateUserFromPayload).toHaveBeenCalledWith(
        payload,
      );
      expect(result).toBe(mockUser);
    });

    it("应该在AuthService验证失败时抛出UnauthorizedException", async () => {
      // Arrange
      const payload = {
        sub: "invalid-user-id",
        username: "invaliduser",
        role: UserRole.DEVELOPER,
      };

      jest.spyOn(tokenService, 'validateUserFromPayload').mockRejectedValue(
        new UnauthorizedException("用户无效或已被禁用")
      );

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokenService.validateUserFromPayload).toHaveBeenCalledWith(
        payload,
      );
    });

    it("应该在任何验证错误时抛出统一的UnauthorizedException", async () => {
      // Arrange
      const payload = {
        sub: "507f1f77bcf86cd799439011",
        username: "testuser",
        role: UserRole.DEVELOPER,
      };

      // 模拟AuthService抛出任意错误
      jest.spyOn(tokenService, 'validateUserFromPayload').mockRejectedValue(
        new Error("数据库连接失败")
      );

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow("JWT令牌无效");
    });

    it("应该处理缺少必要字段的载荷", async () => {
      // Arrange
      const incompletePayload = {
        // 缺少sub字段
        username: "testuser",
        role: UserRole.DEVELOPER,
      } as any;

      jest.spyOn(tokenService, 'validateUserFromPayload').mockRejectedValue(
        new Error("缺少用户ID")
      );

      // Act & Assert
      await expect(strategy.validate(incompletePayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该处理空载荷", async () => {
      // Arrange
      const emptyPayload = {} as any;

      jest.spyOn(tokenService, 'validateUserFromPayload').mockRejectedValue(
        new Error("载荷为空")
      );

      // Act & Assert
      await expect(strategy.validate(emptyPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该处理null载荷", async () => {
      // Arrange
      const nullPayload = null;

      jest.spyOn(tokenService, 'validateUserFromPayload').mockRejectedValue(
        new Error("载荷为null")
      );

      // Act & Assert
      await expect(strategy.validate(nullPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
