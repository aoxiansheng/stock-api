import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@auth/controller/auth.controller';
import { AuthFacadeService } from '@auth/services/facade/auth-facade.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { CreateUserDto, LoginDto } from '@auth/dto/auth.dto';
import { CreateApiKeyDto } from '@auth/dto/apikey.dto';
import { UserRole, Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authFacade: jest.Mocked<AuthFacadeService>;
  let paginationService: jest.Mocked<PaginationService>;

  const mockRequest = {
    user: {
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
    },
  };

  const mockUser = {
    id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    role: UserRole.DEVELOPER,
    status: OperationStatus.ACTIVE,
  };

  beforeEach(async () => {
    const mockAuthFacade = {
      register: jest.fn(),
      login: jest.fn(),
      createApiKey: jest.fn(),
      getUserApiKeys: jest.fn(),
      revokeApiKey: jest.fn(),
      getApiKeyUsage: jest.fn(),
      resetApiKeyRateLimit: jest.fn(),
      getAllUsers: jest.fn(),
    };

    const mockPaginationService = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthFacadeService,
          useValue: mockAuthFacade,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authFacade = module.get(AuthFacadeService);
    paginationService = module.get(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('应该成功调用facade服务注册用户', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Test123!@#',
        role: UserRole.DEVELOPER,
      };
      
      authFacade.register.mockResolvedValue(mockUser);

      // Act
      const result = await controller.register(createUserDto);

      // Assert
      expect(result).toEqual(mockUser);
      expect(authFacade.register).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    it('应该成功调用facade服务登录用户', async () => {
      // Arrange
      const loginDto: LoginDto = {
        username: 'testuser',
        password: 'Test123!@#',
      };
      
      const loginResult = {
        user: mockUser,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };
      
      authFacade.login.mockResolvedValue(loginResult);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toEqual(loginResult);
      expect(authFacade.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('应该成功返回当前用户信息', async () => {
      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual(mockRequest.user);
    });
  });

  describe('createApiKey', () => {
    it('应该成功调用facade服务创建API Key', async () => {
      // Arrange
      const createApiKeyDto: CreateApiKeyDto = {
        name: 'Test API Key',
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
      };
      
      const apiKey = {
        id: 'apikey123',
        appKey: 'app-key',
        name: 'Test API Key',
      };
      
      authFacade.createApiKey.mockResolvedValue(apiKey);

      // Act
      const result = await controller.createApiKey(mockRequest, createApiKeyDto);

      // Assert
      expect(result).toEqual(apiKey);
      expect(authFacade.createApiKey).toHaveBeenCalledWith(
        'user123',
        createApiKeyDto,
      );
    });
  });

  describe('getUserApiKeys', () => {
    it('应该成功调用facade服务获取用户API Keys', async () => {
      // Arrange
      const apiKeys = [
        {
          id: 'apikey123',
          appKey: 'app-key',
          name: 'Test API Key',
        },
      ];
      
      authFacade.getUserApiKeys.mockResolvedValue(apiKeys);

      // Act
      const result = await controller.getUserApiKeys(mockRequest);

      // Assert
      expect(result).toEqual(apiKeys);
      expect(authFacade.getUserApiKeys).toHaveBeenCalledWith('user123');
    });
  });

  describe('revokeApiKey', () => {
    it('应该成功调用facade服务撤销API Key', async () => {
      // Arrange
      const appKey = 'app-key';
      authFacade.revokeApiKey.mockResolvedValue();

      // Act
      const result = await controller.revokeApiKey(mockRequest, appKey);

      // Assert
      expect(result).toEqual({ success: true });
      expect(authFacade.revokeApiKey).toHaveBeenCalledWith(appKey, 'user123');
    });
  });

  describe('getApiKeyUsage', () => {
    it('应该成功调用facade服务获取API Key使用统计', async () => {
      // Arrange
      const appKey = 'app-key';
      const usage = {
        apiKeyId: 'apikey123',
        appKey: 'app-key',
        name: 'Test API Key',
        totalRequestCount: 100,
        todayRequests: 10,
        hourlyRequests: 5,
        successfulRequests: 95,
        failedRequests: 5,
        averageResponseTimeMs: 150,
        lastAccessedAt: new Date(),
        createdAt: new Date()
      };
      
      authFacade.getApiKeyUsage.mockResolvedValue(usage);

      // Act
      const result = await controller.getApiKeyUsage(mockRequest, appKey);

      // Assert
      expect(result).toEqual(usage);
      expect(authFacade.getApiKeyUsage).toHaveBeenCalledWith(appKey, 'user123');
    });
  });

  describe('resetApiKeyRateLimit', () => {
    it('应该成功调用facade服务重置API Key频率限制', async () => {
      // Arrange
      const appKey = 'app-key';
      const resetResult = { success: true };
      authFacade.resetApiKeyRateLimit.mockResolvedValue(resetResult);

      // Act
      const result = await controller.resetApiKeyRateLimit(mockRequest, appKey);

      // Assert
      expect(result).toEqual(resetResult);
      expect(authFacade.resetApiKeyRateLimit).toHaveBeenCalledWith(
        appKey,
        'user123',
      );
    });
  });

  describe('getAllUsers', () => {
    it('应该成功调用facade服务获取所有用户', async () => {
      // Arrange
      const page = 1;
      const limit = 10;
      const includeInactive = false;
      const includeStats = true;
      
      const facadeResult = {
        users: [mockUser as any],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        stats: {
          totalUsers: 1,
          activeUsers: 1,
          roleDistribution: {
            [UserRole.DEVELOPER]: 1,
          },
        },
      };
      
      authFacade.getAllUsers.mockResolvedValue(facadeResult);

      // Act
      const result = await controller.getAllUsers(
        page,
        limit,
        includeInactive,
        includeStats,
      );

      // Assert
      expect(result).toEqual({
        users: [
          {
            id: 'user123',
            username: 'testuser',
            email: 'test@example.com',
            role: UserRole.DEVELOPER,
            status: OperationStatus.ACTIVE,
            createdAt: expect.any(Date),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
        stats: facadeResult.stats,
      });
      expect(authFacade.getAllUsers).toHaveBeenCalledWith(
        page,
        limit,
        includeInactive,
        includeStats,
      );
    });
  });
});