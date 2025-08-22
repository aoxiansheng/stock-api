/**
 * AuthService 单元测试
 * 测试认证服务的核心逻辑，所有外部依赖均为Mock
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConflictException, UnauthorizedException } from "@nestjs/common";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { AuthService } from "../../../../../src/auth/services/auth.service";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UserRole } from "../../../../../src/auth/enums/user-role.enum";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UserRepository } from "../../../../../src/auth/repositories/user.repository";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ApiKeyService } from "../../../../../src/auth/services/apikey.service";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PasswordService } from "../../../../../src/auth/services/password.service";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TokenService } from "../../../../../src/auth/services/token.service";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MetricsPerformanceService } from "../../../../../src/metrics/services/metrics-performance.service";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CreateUserDto, LoginDto } from "../../../../../src/auth/dto/auth.dto";

describe("AuthService", () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let apiKeyService: jest.Mocked<ApiKeyService>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let MetricsPerformanceService: jest.Mocked<MetricsPerformanceService>;

  // Mock 数据 - 使用 any 类型来模拟 Mongoose 文档行为
  const mockUser: any = {
    id: "507f1f77bcf86cd799439011",
    username: "testuser",
    email: "test@example.com",
    passwordHash:
      "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Mf.z1R2PfQgIaVXAu",
    role: UserRole.DEVELOPER,
    isActive: true,
    lastLoginAt: new Date("2024-01-01T00:00:00.000Z"),
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    // 添加 toJSON 方法来模拟 Mongoose 文档行为
    toJSON: function () {
      return {
        id: this.id,
        username: this.username,
        email: this.email,
        role: this.role,
        isActive: this.isActive,
        lastLoginAt: this.lastLoginAt,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    },
  };

  const mockTokens = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  };

  const mockApiKey = {
    id: "507f1f77bcf86cd799439012",
    name: "Test API Key",
    appKey: "ak_test_12345",
    accessToken: "sk_test_secret_token",
    userId: "507f1f77bcf86cd799439011",
    permissions: ["data:read", "query:execute"],
    rateLimit: {
      requests: 1000,
      window: "1h",
    },
    isActive: true,
    usageCount: 0,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  beforeEach(async () => {
    // 创建 Mock 对象
    const mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
      findByUsernames: jest.fn(),
    };

    const mockApiKeyService = {
      createApiKey: jest.fn(),
      getUserApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
      validateApiKey: jest.fn(),
    };

    const mockPasswordService = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    };

    const mockTokenService = {
      generateTokens: jest.fn(),
      validateUserFromPayload: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    const mockMetricsPerformanceService = {
      recordDatabaseQuery: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordAuthentication: jest.fn(),
      recordRequest: jest.fn(),
      recordRateLimit: jest.fn(),
      getEndpointMetrics: jest.fn(),
      getDatabaseMetrics: jest.fn(),
      getRedisMetrics: jest.fn(),
      getSystemMetrics: jest.fn(),
      getPerformanceSummary: jest.fn(),
      wrapWithTiming: jest.fn().mockImplementation((operation, onComplete) => {
        try {
          const result = operation();
          if (result && typeof result._then === "function") {
            return result.then(
              (res) => {
                onComplete(0, true, res);
                return res;
              },
              (err) => {
                onComplete(0, false);
                throw err;
              },
            );
          } else {
            onComplete(0, true, result);
            return result;
          }
        } catch (err) {
          onComplete(0, false);
          throw err;
        }
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: MetricsPerformanceService,
          useValue: mockMetricsPerformanceService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    apiKeyService = module.get(ApiKeyService);
    passwordService = module.get(PasswordService);
    tokenService = module.get(TokenService);
    MetricsPerformanceService = module.get(MetricsPerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    const createUserDto: CreateUserDto = {
      username: "newuser",
      email: "newuser@example.com",
      password: "password123",
      role: UserRole.DEVELOPER,
    };

    it("should successfully register a new user", async () => {
      // Arrange
      userRepository.findByUsernameOrEmail.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue("hashed-password");
      userRepository.create.mockResolvedValue(mockUser as any);

      // Act
      const result = await service.register(createUserDto);

      // Assert
      expect(userRepository.findByUsernameOrEmail).toHaveBeenCalledWith(
        createUserDto.username,
        createUserDto.email,
      );
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        createUserDto.password,
      );
      expect(userRepository.create).toHaveBeenCalledWith({
        username: createUserDto.username,
        email: createUserDto.email,
        passwordHash: "hashed-password",
        role: UserRole.DEVELOPER,
        isActive: true,
      });
      expect(result).toEqual(mockUser.toJSON());
    });

    it("should throw ConflictException if username already exists", async () => {
      // Arrange
      userRepository.findByUsernameOrEmail.mockResolvedValue(mockUser as any);

      // Act & Assert
      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findByUsernameOrEmail).toHaveBeenCalledWith(
        createUserDto.username,
        createUserDto.email,
      );
      expect(passwordService.hashPassword).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictException if email already exists", async () => {
      // Arrange
      const existingUser = { ...mockUser, email: createUserDto.email };
      userRepository.findByUsernameOrEmail.mockResolvedValue(
        existingUser as any,
      );

      // Act & Assert
      await expect(service.register(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userRepository.findByUsernameOrEmail).toHaveBeenCalledWith(
        createUserDto.username,
        createUserDto.email,
      );
    });

    it("should use default role if not provided", async () => {
      // Arrange
      const createUserDtoWithoutRole = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
      };
      userRepository.findByUsernameOrEmail.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue("hashed-password");
      userRepository.create.mockResolvedValue(mockUser as any);

      // Act
      await service.register(createUserDtoWithoutRole);

      // Assert
      expect(userRepository.create).toHaveBeenCalledWith({
        username: createUserDtoWithoutRole.username,
        email: createUserDtoWithoutRole.email,
        passwordHash: "hashed-password",
        role: UserRole.DEVELOPER, // 默认角色
        isActive: true,
      });
    });
  });

  describe("login", () => {
    const loginDto: LoginDto = {
      username: "testuser",
      password: "password123",
    };

    it("should successfully login with valid credentials", async () => {
      // Arrange
      userRepository.findByUsername.mockResolvedValue(mockUser as any);
      passwordService.comparePassword.mockResolvedValue(true);
      tokenService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(userRepository.findByUsername).toHaveBeenCalledWith(
        loginDto.username,
      );
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(tokenService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        user: mockUser.toJSON(),
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
      });
    });

    it("should throw UnauthorizedException if user not found", async () => {
      // Arrange
      userRepository.findByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findByUsername).toHaveBeenCalledWith(
        loginDto.username,
      );
      expect(passwordService.comparePassword).not.toHaveBeenCalled();
      expect(tokenService.generateTokens).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if user is inactive", async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findByUsername.mockResolvedValue(inactiveUser as any);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findByUsername).toHaveBeenCalledWith(
        loginDto.username,
      );
      expect(passwordService.comparePassword).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      // Arrange
      userRepository.findByUsername.mockResolvedValue(mockUser as any);
      passwordService.comparePassword.mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findByUsername).toHaveBeenCalledWith(
        loginDto.username,
      );
      expect(passwordService.comparePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
      expect(tokenService.generateTokens).not.toHaveBeenCalled();
    });
  });

  describe("refreshToken", () => {
    const refreshToken = "mock-refresh-token";
    const mockPayload = {
      sub: mockUser.id,
      username: mockUser.username,
      role: mockUser.role,
    };

    it("should successfully refresh token", async () => {
      // Arrange
      tokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
      tokenService.validateUserFromPayload.mockResolvedValue(mockUser);
      tokenService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(tokenService.validateUserFromPayload).toHaveBeenCalledWith(
        mockPayload,
      );
      expect(tokenService.generateTokens).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockTokens);
    });

    it("should throw UnauthorizedException if token is invalid", async () => {
      // Arrange
      tokenService.verifyRefreshToken.mockRejectedValue(
        new UnauthorizedException("Invalid token"),
      );

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(tokenService.validateUserFromPayload).not.toHaveBeenCalled();
    });

    it("should throw UnauthorizedException if user is invalid", async () => {
      // Arrange
      tokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
      tokenService.validateUserFromPayload.mockRejectedValue(
        new UnauthorizedException("Invalid user"),
      );

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(tokenService.validateUserFromPayload).toHaveBeenCalledWith(
        mockPayload,
      );
    });
  });

  describe("API Key methods", () => {
    const userId = "507f1f77bcf86cd799439011";
    const apiKeyId = "507f1f77bcf86cd799439012";
    const createApiKeyDto = {
      name: "Test API Key",
      permissions: ["data:read", "query:execute"],
    };

    it("should create API key", async () => {
      // Arrange
      apiKeyService.createApiKey.mockResolvedValue(mockApiKey as any);

      // Act
      const result = await service.createApiKey(userId, createApiKeyDto);

      // Assert
      expect(apiKeyService.createApiKey).toHaveBeenCalledWith(
        userId,
        createApiKeyDto,
      );
      expect(result).toEqual(mockApiKey);
    });

    it("should get user API keys", async () => {
      // Arrange
      const mockApiKeys = [mockApiKey as any];
      apiKeyService.getUserApiKeys.mockResolvedValue(mockApiKeys);

      // Act
      const result = await service.getUserApiKeys(userId);

      // Assert
      expect(apiKeyService.getUserApiKeys).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockApiKeys);
    });

    it("should revoke API key", async () => {
      // Arrange
      apiKeyService.revokeApiKey.mockResolvedValue(undefined);

      // Act
      await service.revokeApiKey(apiKeyId, userId);

      // Assert
      expect(apiKeyService.revokeApiKey).toHaveBeenCalledWith(apiKeyId, userId);
    });

    it("should validate API key", async () => {
      // Arrange
      const appKey = "ak_test_12345";
      const accessToken = "sk_test_secret_token";
      apiKeyService.validateApiKey.mockResolvedValue(mockApiKey as any);

      // Act
      const result = await service.validateApiKey(appKey, accessToken);

      // Assert
      expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(
        appKey,
        accessToken,
      );
      expect(result).toEqual(mockApiKey);
    });
  });

  describe("error handling", () => {
    it("should handle database errors during registration", async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
        role: UserRole.DEVELOPER,
      };
      userRepository.findByUsernameOrEmail.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue("hashed-password");
      userRepository.create.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(service.register(createUserDto)).rejects.toThrow(
        "Database error",
      );
      expect(userRepository.create).toHaveBeenCalled();
    });

    it("should handle password hashing errors", async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
        role: UserRole.DEVELOPER,
      };
      userRepository.findByUsernameOrEmail.mockResolvedValue(null);
      passwordService.hashPassword.mockRejectedValue(new Error("Hash error"));

      // Act & Assert
      await expect(service.register(createUserDto)).rejects.toThrow(
        "Hash error",
      );
      expect(passwordService.hashPassword).toHaveBeenCalledWith(
        createUserDto.password,
      );
    });
  });
});
