/**
 * JwtStrategy 单元测试
 * 测试JWT认证策略的验证逻辑
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";

import { JwtStrategy } from "../../../../src/auth/strategies/jwt.strategy";
import {
  TokenService,
} from "../../../../src/auth/services/token.service";
import { UserRole } from "../../../../src/auth/enums/user-role.enum";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let tokenService: TokenService;
  let configService: ConfigService;

  const mockUser = {
    _id: "507f1f77bcf86cd799439011",
    username: "testuser",
    email: "test@example.com",
    role: UserRole.DEVELOPER,
    isActive: true,
  };

  beforeEach(async () => {
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
          useValue: {
            get: jest.fn(),
          },
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
      // Arrange
      const mockSecret = "custom-jwt-secret";
      configService.get = jest.fn().mockReturnValue(mockSecret);

      // Act
      new JwtStrategy(tokenService, configService);

      // Assert
      expect(configService.get).toHaveBeenCalledWith("JWT_SECRET");
      // 注意：由于PassportStrategy的内部实现，我们无法直接验证密钥设置
      // 但可以确保configService.get被正确调用
    });

    it("应该使用默认JWT密钥当配置未设置时", () => {
      // Arrange
      configService.get = jest.fn().mockReturnValue(null);

      // Act
      new JwtStrategy(tokenService, configService);

      // Assert
      expect(configService.get).toHaveBeenCalledWith("JWT_SECRET");
      // 默认密钥会被使用，但无法直接测试
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

      tokenService.validateUserFromPayload = jest
        .fn()
        .mockResolvedValue(mockUser);

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

      tokenService.validateUserFromPayload = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException("用户无效或已被禁用"));

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
      tokenService.validateUserFromPayload = jest
        .fn()
        .mockRejectedValue(new Error("数据库连接失败"));

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

      tokenService.validateUserFromPayload = jest
        .fn()
        .mockRejectedValue(new Error("缺少用户ID"));

      // Act & Assert
      await expect(strategy.validate(incompletePayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该处理空载荷", async () => {
      // Arrange
      const emptyPayload = {} as any;

      tokenService.validateUserFromPayload = jest
        .fn()
        .mockRejectedValue(new Error("载荷为空"));

      // Act & Assert
      await expect(strategy.validate(emptyPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("应该处理null载荷", async () => {
      // Arrange
      const nullPayload = null;

      tokenService.validateUserFromPayload = jest
        .fn()
        .mockRejectedValue(new Error("载荷为null"));

      // Act & Assert
      await expect(strategy.validate(nullPayload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
