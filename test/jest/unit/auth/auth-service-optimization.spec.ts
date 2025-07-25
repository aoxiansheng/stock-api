import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../../../../src/auth/services/auth.service";
import { UserRepository } from "../../../../src/auth/repositories/user.repository";
import { PasswordService } from "../../../../src/auth/services/password.service";
import {
  TokenService,
  JwtPayload,
} from "../../../../src/auth/services/token.service";
import { ApiKeyService } from "../../../../src/auth/services/apikey.service";
import { PerformanceMonitorService } from "../../../../src/metrics/services/performance-monitor.service";
import { UserRole } from "../../../../src/auth/enums/user-role.enum";
import {
  AUTH_OPERATIONS,
  AUTH_MESSAGES,
  AUTH_DEFAULTS,
} from "../../../../src/auth/constants/auth.constants";
import { ERROR_MESSAGES } from "../../../../src/common/constants/error-messages.constants";

describe("AuthService Optimization Features", () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordService: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let apiKeyService: jest.Mocked<ApiKeyService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let performanceMonitorService: jest.Mocked<PerformanceMonitorService>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockUserRepository = {
      findByUsernameOrEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
    };

    const mockPasswordService = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
    };

    const mockTokenService = {
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
      validateUserFromPayload: jest.fn(),
    };

    const mockApiKeyService = {
      createApiKey: jest.fn(),
      getUserApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
    };

    const mockPerformanceMonitorService = {
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
          if (result && typeof result.then === "function") {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
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
          provide: ApiKeyService,
          useValue: mockApiKeyService,
        },
        {
          provide: PerformanceMonitorService,
          useValue: mockPerformanceMonitorService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    passwordService = module.get(PasswordService);
    tokenService = module.get(TokenService);
    apiKeyService = module.get(ApiKeyService);
    performanceMonitorService = module.get(PerformanceMonitorService);

    // Spy on logger
    loggerSpy = jest.spyOn((service as any).logger, "log").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants Usage", () => {
    it("should use operation constants for all methods", () => {
      expect(AUTH_OPERATIONS.REGISTER).toBe("register");
      expect(AUTH_OPERATIONS.LOGIN).toBe("login");
      expect(AUTH_OPERATIONS.REFRESH_TOKEN).toBe("refreshToken");
    });

    it("should use message constants for logging", () => {
      expect(AUTH_MESSAGES.USER_REGISTERED).toBe("新用户注册成功");
      expect(AUTH_MESSAGES.USER_LOGIN_SUCCESS).toBe("用户登录成功");
      expect(AUTH_MESSAGES.TOKEN_REFRESHED).toBe("令牌刷新成功");
    });

    it("should use default constants for user creation", () => {
      expect(AUTH_DEFAULTS.DEFAULT_USER_ROLE).toBe(UserRole.DEVELOPER);
      expect(AUTH_DEFAULTS.DEFAULT_USER_ACTIVE_STATUS).toBe(true);
    });
  });

  describe("Enhanced User Registration", () => {
    it("should use constants for successful registration", async () => {
      const createUserDto = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        _id: "user123",
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        role: UserRole.DEVELOPER,
        isActive: true,
        toJSON: function () {
          return {
            id: this.id,
            username: this.username,
            email: this.email,
            role: this.role,
            isActive: this.isActive,
          };
        },
      };

      userRepository.findByUsernameOrEmail.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue("hashedPassword");
      userRepository.create.mockResolvedValue(mockUser as any);

      await service.register(createUserDto);

      expect(loggerSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.REGISTRATION_STARTED,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.REGISTER,
          username: "testuser",
          email: "test@example.com",
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.USER_REGISTERED,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.REGISTER,
          username: "testuser",
          role: UserRole.DEVELOPER,
          userId: "user123",
        }),
      );
    });

    it("should use default role from constants", async () => {
      const createUserDto = {
        username: "testuser",
        email: "test@example.com",
        password: "password123",
        // No role specified, should use default
      };

      userRepository.findByUsernameOrEmail.mockResolvedValue(null);
      passwordService.hashPassword.mockResolvedValue("hashedPassword");
      userRepository.create.mockResolvedValue({
        id: "user123",
        username: "testuser",
        email: "test@example.com",
        role: AUTH_DEFAULTS.DEFAULT_USER_ROLE,
        isActive: AUTH_DEFAULTS.DEFAULT_USER_ACTIVE_STATUS,
        toJSON: function () {
          return {
            id: this.id,
            username: this.username,
            email: this.email,
            role: this.role,
            isActive: this.isActive,
          };
        },
      } as any);

      await service.register(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: AUTH_DEFAULTS.DEFAULT_USER_ROLE,
          isActive: AUTH_DEFAULTS.DEFAULT_USER_ACTIVE_STATUS,
        }),
      );
    });

    it("should use constants for user exists error", async () => {
      const createUserDto = {
        username: "existinguser",
        email: "existing@example.com",
        password: "password123",
      };

      const existingUser = { username: "existinguser" };
      userRepository.findByUsernameOrEmail.mockResolvedValue(
        existingUser as any,
      );

      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();

      await expect(service.register(createUserDto)).rejects.toThrow(
        new ConflictException(ERROR_MESSAGES.USER_EXISTS),
      );

      expect(warnSpy).toHaveBeenCalledWith(
        ERROR_MESSAGES.USER_EXISTS,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.REGISTER,
          username: "existinguser",
          email: "existing@example.com",
        }),
      );
    });
  });

  describe("Enhanced User Login", () => {
    it("should use constants for successful login", async () => {
      const loginDto = {
        username: "testuser",
        password: "password123",
      };

      const mockUser = {
        _id: "user123",
        id: "user123",
        username: "testuser",
        role: UserRole.DEVELOPER,
        isActive: true,
        passwordHash: "hashedPassword",
        toJSON: function () {
          return {
            id: this.id,
            username: this.username,
            role: this.role,
            isActive: this.isActive,
          };
        },
      };

      const mockTokens = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      userRepository.findByUsername.mockResolvedValue(mockUser as any);
      passwordService.comparePassword.mockResolvedValue(true);
      tokenService.generateTokens.mockResolvedValue(mockTokens);

      await service.login(loginDto);

      expect(loggerSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.LOGIN_ATTEMPT,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.LOGIN,
          username: "testuser",
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.USER_LOGIN_SUCCESS,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.LOGIN,
          username: "testuser",
          userId: "user123",
          role: UserRole.DEVELOPER,
        }),
      );
    });

    it("should use constants for user not found error", async () => {
      const loginDto = {
        username: "nonexistent",
        password: "password123",
      };

      userRepository.findByUsername.mockResolvedValue(null);

      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS),
      );

      expect(warnSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.USER_NOT_FOUND_OR_INACTIVE,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.LOGIN,
          username: "nonexistent",
        }),
      );
    });

    it("should use constants for password verification failure", async () => {
      const loginDto = {
        username: "testuser",
        password: "wrongpassword",
      };

      const mockUser = {
        username: "testuser",
        isActive: true,
        passwordHash: "hashedPassword",
      };

      userRepository.findByUsername.mockResolvedValue(mockUser as any);
      passwordService.comparePassword.mockResolvedValue(false);

      const warnSpy = jest
        .spyOn((service as any).logger, "warn")
        .mockImplementation();

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS),
      );

      expect(warnSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.PASSWORD_VERIFICATION_FAILED,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.LOGIN,
          username: "testuser",
        }),
      );
    });
  });

  describe("Enhanced Token Refresh", () => {
    it("should use constants for successful token refresh", async () => {
      const refreshToken = "valid-refresh-token";
      const mockPayload: JwtPayload = {
        sub: "user123",
        username: "testuser",
        role: UserRole.DEVELOPER,
      };
      const mockUser = {
        _id: "user123",
        id: "user123",
        username: "testuser",
        toJSON: function () {
          return {
            id: this.id,
            username: this.username,
          };
        },
      };
      const mockTokens = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      tokenService.verifyRefreshToken.mockResolvedValue(mockPayload);
      tokenService.validateUserFromPayload.mockResolvedValue(mockUser as any);
      tokenService.generateTokens.mockResolvedValue(mockTokens);

      await service.refreshToken(refreshToken);

      expect(loggerSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.TOKEN_REFRESHED,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.REFRESH_TOKEN,
          username: "testuser",
          userId: "user123",
        }),
      );
    });

    it("should log token validation start", async () => {
      const refreshToken = "valid-refresh-token";
      const debugSpy = jest
        .spyOn((service as any).logger, "debug")
        .mockImplementation();

      tokenService.verifyRefreshToken.mockResolvedValue({
        sub: "user123",
        username: "testuser",
        role: UserRole.DEVELOPER,
      });
      tokenService.validateUserFromPayload.mockResolvedValue({
        username: "testuser",
      } as any);
      tokenService.generateTokens.mockResolvedValue({
        accessToken: "token",
        refreshToken: "token",
      });

      await service.refreshToken(refreshToken);

      expect(debugSpy).toHaveBeenCalledWith(
        AUTH_MESSAGES.TOKEN_VALIDATION_STARTED,
        expect.objectContaining({
          operation: AUTH_OPERATIONS.REFRESH_TOKEN,
        }),
      );
    });
  });

  describe("Error Message Consistency", () => {
    it("should use consistent error messages across methods", () => {
      // Test that all error messages are using constants
      expect(ERROR_MESSAGES.USER_EXISTS).toBe("用户名或邮箱已存在");
      expect(ERROR_MESSAGES.INVALID_CREDENTIALS).toBe("用户名或密码错误");
      expect(AUTH_MESSAGES.PASSWORD_VERIFICATION_FAILED).toBe("密码验证失败");
      expect(AUTH_MESSAGES.USER_NOT_FOUND_OR_INACTIVE).toBe(
        "尝试使用不存在或未激活的用户登录",
      );
    });

    it("should use consistent operation names", () => {
      expect(AUTH_OPERATIONS.REGISTER).toBe("register");
      expect(AUTH_OPERATIONS.LOGIN).toBe("login");
      expect(AUTH_OPERATIONS.REFRESH_TOKEN).toBe("refreshToken");
    });
  });
});
