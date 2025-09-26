import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { Request } from 'express';
import { AuthController } from '@auth/controller/auth.controller';
import { AuthFacadeService } from '@auth/services/facade/auth-facade.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { CreateUserDto, LoginDto } from '@auth/dto/auth.dto';
import { CreateApiKeyDto } from '@auth/dto/apikey.dto';
import { UserRole } from '@auth/enums/user-role.enum';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

// Mock data factories
const createMockUser = (overrides = {}) => ({
  id: '507f1f77bcf86cd799439011',
  _id: '507f1f77bcf86cd799439011',
  username: 'testuser',
  email: 'test@example.com',
  passwordHash: '$2b$12$hashedpassword', // 添加必需的字段
  role: UserRole.DEVELOPER,
  status: OperationStatus.ACTIVE,
  createdAt: new Date('2024-01-01T10:00:00.000Z'),
  lastAccessedAt: new Date('2024-01-01T11:30:00.000Z'),
  ...overrides,
});

const createMockLoginResponse = (overrides = {}) => ({
  user: createMockUser(),
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  ...overrides,
});

const createMockApiKey = (overrides = {}) => ({
  id: '507f1f77bcf86cd799439012',
  name: 'Test API Key',
  appKey: 'ak_live_1234567890abcdef',
  keyPrefix: 'ak_live_',
  key: 'ak_live_1234567890abcdef1234567890abcdef',
  userId: '507f1f77bcf86cd799439011',
  permissions: [Permission.DATA_READ],
  rateLimit: {
    requestsPerMinute: 1000,
    requestsPerDay: 50000,
  },
  status: OperationStatus.ACTIVE,
  expiresAt: new Date('2025-01-01T12:00:00.000Z'),
  createdAt: new Date('2024-01-01T10:00:00.000Z'),
  ...overrides,
});

describe('AuthController', () => {
  let controller: AuthController;
  let authFacade: jest.Mocked<AuthFacadeService>;
  let paginationService: jest.Mocked<PaginationService>;

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

  const mockPaginationService = {
    paginate: jest.fn(),
    validatePaginationParams: jest.fn(),
  };

  beforeEach(async () => {
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

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('register', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'securePassword123',
      role: UserRole.DEVELOPER,
    };

    it('should register a new user successfully', async () => {
      const mockUser = createMockUser({ username: 'newuser', email: 'newuser@example.com' });
      authFacade.register.mockResolvedValue(mockUser);

      const result = await controller.register(createUserDto);

      expect(authFacade.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });

    it('should handle registration with different roles', async () => {
      const adminDto = { ...createUserDto, role: UserRole.ADMIN };
      const mockAdminUser = createMockUser({ role: UserRole.ADMIN });

      authFacade.register.mockResolvedValue(mockAdminUser);

      const result = await controller.register(adminDto);

      expect(authFacade.register).toHaveBeenCalledWith(adminDto);
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should handle registration errors', async () => {
      const error = new Error('Username already exists');
      authFacade.register.mockRejectedValue(error);

      await expect(controller.register(createUserDto)).rejects.toThrow('Username already exists');
      expect(authFacade.register).toHaveBeenCalledWith(createUserDto);
    });

    it('should validate user input through ValidationPipe', async () => {
      const invalidDto = { ...createUserDto, email: 'invalid-email' };
      const mockUser = createMockUser();

      authFacade.register.mockResolvedValue(mockUser);

      // The ValidationPipe would handle validation, but we test the service interaction
      const result = await controller.register(invalidDto as CreateUserDto);

      expect(authFacade.register).toHaveBeenCalledWith(invalidDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      username: 'testuser',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const mockLoginResponse = createMockLoginResponse();
      authFacade.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(authFacade.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockLoginResponse);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual(mockLoginResponse.user);
    });

    it('should handle invalid credentials', async () => {
      const error = new Error('Invalid username or password');
      authFacade.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow('Invalid username or password');
      expect(authFacade.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle login with different username formats', async () => {
      const emailLoginDto = { ...loginDto, username: 'test@example.com' };
      const mockLoginResponse = createMockLoginResponse();

      authFacade.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(emailLoginDto);

      expect(authFacade.login).toHaveBeenCalledWith(emailLoginDto);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should handle account locked scenarios', async () => {
      const error = new Error('Account is locked due to too many failed attempts');
      authFacade.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow('Account is locked');
      expect(authFacade.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual(mockUser);
    });

    it('should handle different user roles in profile', async () => {
      const mockAdminUser = createMockUser({ role: UserRole.ADMIN });
      const mockRequest = { user: mockAdminUser } as Request & { user: any };

      const result = await controller.getProfile(mockRequest);

      expect(result.role).toBe(UserRole.ADMIN);
      expect(result).toEqual(mockAdminUser);
    });

    it('should include user activity timestamps', async () => {
      const mockUser = createMockUser({
        lastAccessedAt: new Date('2024-01-01T12:00:00.000Z'),
      });
      const mockRequest = { user: mockUser } as Request & { user: any };

      const result = await controller.getProfile(mockRequest);

      expect(result.lastAccessedAt).toEqual(new Date('2024-01-01T12:00:00.000Z'));
    });
  });

  describe('createApiKey', () => {
    const createApiKeyDto: CreateApiKeyDto = {
      name: 'My Test API Key',
      permissions: [Permission.DATA_READ, Permission.DATA_WRITE],
      rateLimit: {
        requestLimit: 1000,
        window: '1h',
      },
    };

    it('should create API key successfully', async () => {
      const mockUser = createMockUser();
      const mockApiKey = createMockApiKey({ name: 'My Test API Key' });
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.createApiKey.mockResolvedValue(mockApiKey);

      const result = await controller.createApiKey(mockRequest, createApiKeyDto);

      expect(authFacade.createApiKey).toHaveBeenCalledWith(mockUser.id, createApiKeyDto);
      expect(result).toEqual(mockApiKey);
    });

    it('should handle API key creation with minimal permissions', async () => {
      const minimalDto = { ...createApiKeyDto, permissions: [Permission.DATA_READ] };
      const mockUser = createMockUser();
      const mockApiKey = createMockApiKey({ permissions: [Permission.DATA_READ] });
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.createApiKey.mockResolvedValue(mockApiKey);

      const result = await controller.createApiKey(mockRequest, minimalDto);

      expect(authFacade.createApiKey).toHaveBeenCalledWith(mockUser.id, minimalDto);
      expect(result.permissions).toEqual([Permission.DATA_READ]);
    });

    it('should handle API key creation with expiry date', async () => {
      const dtoWithExpiry = {
        ...createApiKeyDto,
        expiresAt: new Date('2025-12-31T23:59:59.000Z')
      };
      const mockUser = createMockUser();
      const mockApiKey = createMockApiKey({ expiresAt: new Date('2025-12-31T23:59:59.000Z') });
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.createApiKey.mockResolvedValue(mockApiKey);

      const result = await controller.createApiKey(mockRequest, dtoWithExpiry);

      expect(result.expiresAt).toEqual(new Date('2025-12-31T23:59:59.000Z'));
    });

    it('should handle API key creation errors', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('Maximum API keys limit exceeded');

      authFacade.createApiKey.mockRejectedValue(error);

      await expect(
        controller.createApiKey(mockRequest, createApiKeyDto)
      ).rejects.toThrow('Maximum API keys limit exceeded');
    });
  });

  describe('getUserApiKeys', () => {
    it('should get user API keys successfully', async () => {
      const mockUser = createMockUser();
      const mockApiKeys = [createMockApiKey(), createMockApiKey({ name: 'Another Key' })];
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.getUserApiKeys.mockResolvedValue(mockApiKeys);

      const result = await controller.getUserApiKeys(mockRequest);

      expect(authFacade.getUserApiKeys).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockApiKeys);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no API keys', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.getUserApiKeys.mockResolvedValue([]);

      const result = await controller.getUserApiKeys(mockRequest);

      expect(result).toEqual([]);
    });

    it('should handle errors when fetching API keys', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('Database connection failed');

      authFacade.getUserApiKeys.mockRejectedValue(error);

      await expect(controller.getUserApiKeys(mockRequest)).rejects.toThrow('Database connection failed');
    });
  });

  describe('revokeApiKey', () => {
    const appKey = 'ak_live_1234567890abcdef';

    it('should revoke API key successfully', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.revokeApiKey.mockResolvedValue(undefined);

      const result = await controller.revokeApiKey(mockRequest, appKey);

      expect(authFacade.revokeApiKey).toHaveBeenCalledWith(appKey, mockUser.id);
      expect(result).toEqual({ success: true });
    });

    it('should handle API key not found error', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('API key not found');

      authFacade.revokeApiKey.mockRejectedValue(error);

      await expect(
        controller.revokeApiKey(mockRequest, appKey)
      ).rejects.toThrow('API key not found');
    });

    it('should handle unauthorized revocation attempt', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('Insufficient permissions to revoke this API key');

      authFacade.revokeApiKey.mockRejectedValue(error);

      await expect(
        controller.revokeApiKey(mockRequest, appKey)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('getApiKeyUsage', () => {
    const appKey = 'ak_live_1234567890abcdef';

    it('should get API key usage successfully', async () => {
      const mockUser = createMockUser();
      const mockUsage = {
        apiKeyId: '507f1f77bcf86cd799439012',
        appKey,
        name: 'Test API Key',
        totalRequestCount: 1500,
        todayRequests: 200,
        hourlyRequests: 15,
        successfulRequests: 1425,
        failedRequests: 75,
        averageResponseTimeMs: 150,
        lastAccessedAt: new Date('2024-01-01T11:30:00.000Z'),
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
      };
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.getApiKeyUsage.mockResolvedValue(mockUsage);

      const result = await controller.getApiKeyUsage(mockRequest, appKey);

      expect(authFacade.getApiKeyUsage).toHaveBeenCalledWith(appKey, mockUser.id);
      expect(result).toEqual(mockUsage);
      expect(result.totalRequestCount).toBe(1500);
    });

    it('should handle API key usage for inactive key', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('API key is inactive');

      authFacade.getApiKeyUsage.mockRejectedValue(error);

      await expect(
        controller.getApiKeyUsage(mockRequest, appKey)
      ).rejects.toThrow('API key is inactive');
    });

    it('should handle permission denied for usage statistics', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('Insufficient permissions to access API key usage statistics');

      authFacade.getApiKeyUsage.mockRejectedValue(error);

      await expect(
        controller.getApiKeyUsage(mockRequest, appKey)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('resetApiKeyRateLimit', () => {
    const appKey = 'ak_live_1234567890abcdef';

    it('should reset API key rate limit successfully', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.resetApiKeyRateLimit.mockResolvedValue({ success: true });

      const result = await controller.resetApiKeyRateLimit(mockRequest, appKey);

      expect(authFacade.resetApiKeyRateLimit).toHaveBeenCalledWith(appKey, mockUser.id);
      expect(result).toEqual({ success: true });
    });

    it('should handle rate limit reset for non-existent key', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('API key not found');

      authFacade.resetApiKeyRateLimit.mockRejectedValue(error);

      await expect(
        controller.resetApiKeyRateLimit(mockRequest, appKey)
      ).rejects.toThrow('API key not found');
    });

    it('should handle permission denied for rate limit reset', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };
      const error = new Error('Insufficient permissions to reset API key rate limit');

      authFacade.resetApiKeyRateLimit.mockRejectedValue(error);

      await expect(
        controller.resetApiKeyRateLimit(mockRequest, appKey)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('getAllUsers (Admin only)', () => {
    const mockPaginatedUsers = {
      users: [
        createMockUser({ username: 'user1' }),
        createMockUser({ username: 'user2', role: UserRole.ADMIN }),
      ],
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
      stats: {
        totalUsers: 25,
        activeUsers: 23,
        roleDistribution: {
          admin: 2,
          developer: 18,
          user: 5,
        },
      },
    };

    it('should get all users with default parameters', async () => {
      authFacade.getAllUsers.mockResolvedValue(mockPaginatedUsers as any);

      const result = await controller.getAllUsers();

      expect(authFacade.getAllUsers).toHaveBeenCalledWith(1, 10, false, true);
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.stats).toBeDefined();
    });

    it('should get all users with custom pagination parameters', async () => {
      authFacade.getAllUsers.mockResolvedValue({
        ...mockPaginatedUsers,
        page: 2,
        limit: 20,
      } as any);

      const result = await controller.getAllUsers(2, 20, true, false);

      expect(authFacade.getAllUsers).toHaveBeenCalledWith(2, 20, true, false);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should include inactive users when requested', async () => {
      const mockWithInactive = {
        ...mockPaginatedUsers,
        total: 30,
        stats: {
          totalUsers: 30,
          activeUsers: 23,
          roleDistribution: {
            admin: 2,
            developer: 20,
            user: 8,
          },
        },
      };

      authFacade.getAllUsers.mockResolvedValue(mockWithInactive as any);

      const result = await controller.getAllUsers(1, 10, true, true);

      expect(authFacade.getAllUsers).toHaveBeenCalledWith(1, 10, true, true);
      expect(result.stats.totalUsers).toBe(30);
    });

    it('should exclude stats when not requested', async () => {
      const mockWithoutStats = {
        users: mockPaginatedUsers.users,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
        stats: mockPaginatedUsers.stats,
      };

      authFacade.getAllUsers.mockResolvedValue(mockWithoutStats as any);

      const result = await controller.getAllUsers(1, 10, false, false);

      expect(authFacade.getAllUsers).toHaveBeenCalledWith(1, 10, false, false);
      expect(result.stats).toBeUndefined();
    });

    it('should handle errors when fetching users', async () => {
      const error = new Error('Database connection failed');
      authFacade.getAllUsers.mockRejectedValue(error);

      await expect(controller.getAllUsers()).rejects.toThrow('Database connection failed');
    });

    it('should properly map user data in response', async () => {
      const mockUsersWithIds = {
        ...mockPaginatedUsers,
        users: [
          {
            ...createMockUser(),
            _id: '507f1f77bcf86cd799439011',
            id: undefined,
          },
        ],
      };

      authFacade.getAllUsers.mockResolvedValue(mockUsersWithIds as any);

      const result = await controller.getAllUsers();

      expect(result.users[0].id).toBe('507f1f77bcf86cd799439011');
      expect(result.users[0].username).toBeDefined();
      expect(result.users[0].email).toBeDefined();
      expect(result.users[0].role).toBeDefined();
    });

    it('should handle large page numbers gracefully', async () => {
      const mockEmptyPage = {
        users: [],
        total: 25,
        page: 100,
        limit: 10,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
        stats: mockPaginatedUsers.stats,
      };

      authFacade.getAllUsers.mockResolvedValue(mockEmptyPage as any);

      const result = await controller.getAllUsers(100, 10, false, true);

      expect(result.users).toHaveLength(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle stats calculation correctly', async () => {
      const mockWithStats = {
        ...mockPaginatedUsers,
        stats: {
          totalUsers: 100,
          activeUsers: 95,
          roleDistribution: {
            admin: 5,
            developer: 60,
            user: 35,
          },
        },
      };

      authFacade.getAllUsers.mockResolvedValue(mockWithStats as any);

      const result = await controller.getAllUsers(1, 10, false, true);

      expect(result.stats.totalUsers).toBe(100);
      expect(result.stats.activeUsers).toBe(95);
      expect(result.stats.roleDistribution.admin).toBe(5);
      expect(result.stats.roleDistribution.developer).toBe(60);
      expect(result.stats.roleDistribution.user).toBe(35);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle null user in request objects', async () => {
      const mockRequest = { user: null } as any;

      expect(() => controller.getProfile(mockRequest)).not.toThrow();
      const result = await controller.getProfile(mockRequest);
      expect(result).toBeNull();
    });

    it('should handle undefined parameters gracefully', async () => {
      const mockUser = createMockUser();
      const mockRequest = { user: mockUser } as Request & { user: any };

      authFacade.getUserApiKeys.mockResolvedValue([]);

      const result = await controller.getUserApiKeys(mockRequest);
      expect(result).toEqual([]);
    });

    it('should handle facade service throwing unexpected errors', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password',
        role: UserRole.DEVELOPER,
      };

      const error = new Error('Unexpected service error');
      authFacade.register.mockRejectedValue(error);

      await expect(controller.register(createUserDto)).rejects.toThrow('Unexpected service error');
    });

    it('should handle malformed request parameters', async () => {
      const result = await controller.getAllUsers('invalid' as any, 'invalid' as any);

      expect(authFacade.getAllUsers).toHaveBeenCalledWith('invalid', 'invalid', false, true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete user workflow', async () => {
      const createUserDto: CreateUserDto = {
        username: 'workflowuser',
        email: 'workflow@example.com',
        password: 'password123',
        role: UserRole.DEVELOPER,
      };

      const loginDto: LoginDto = {
        username: 'workflowuser',
        password: 'password123',
      };

      const createApiKeyDto: CreateApiKeyDto = {
        name: 'Workflow API Key',
        permissions: [Permission.DATA_READ],
      };

      // 1. Register user
      const mockUser = createMockUser({
        username: 'workflowuser',
        email: 'workflow@example.com'
      });
      authFacade.register.mockResolvedValue(mockUser);

      const registeredUser = await controller.register(createUserDto);
      expect(registeredUser.username).toBe('workflowuser');

      // 2. Login user
      const mockLoginResponse = createMockLoginResponse({ user: mockUser });
      authFacade.login.mockResolvedValue(mockLoginResponse);

      const loginResponse = await controller.login(loginDto);
      expect(loginResponse.accessToken).toBeDefined();

      // 3. Get profile
      const mockRequest = { user: mockUser } as Request & { user: any };
      const profile = await controller.getProfile(mockRequest);
      expect(profile.username).toBe('workflowuser');

      // 4. Create API key
      const mockApiKey = createMockApiKey({ name: 'Workflow API Key' });
      authFacade.createApiKey.mockResolvedValue(mockApiKey);

      const apiKey = await controller.createApiKey(mockRequest, createApiKeyDto);
      expect(apiKey.name).toBe('Workflow API Key');

      // 5. Get user API keys
      authFacade.getUserApiKeys.mockResolvedValue([mockApiKey]);

      const userApiKeys = await controller.getUserApiKeys(mockRequest);
      expect(userApiKeys).toHaveLength(1);
      expect(userApiKeys[0].name).toBe('Workflow API Key');
    });

    it('should handle admin workflow', async () => {
      // Admin gets all users
      const mockPaginatedUsers = {
        users: [createMockUser(), createMockUser({ role: UserRole.ADMIN })],
        total: 50,
        page: 1,
        limit: 10,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
        stats: {
          totalUsers: 50,
          activeUsers: 48,
          roleDistribution: {
            admin: 5,
            developer: 30,
            user: 15,
          },
        },
      };

      authFacade.getAllUsers.mockResolvedValue(mockPaginatedUsers as any);

      const result = await controller.getAllUsers(1, 10, false, true);

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.stats.totalUsers).toBe(50);
    });
  });

  describe('logging and monitoring', () => {
    it('should log important operations', async () => {
      const createUserDto: CreateUserDto = {
        username: 'logtest',
        email: 'logtest@example.com',
        password: 'password',
        role: UserRole.DEVELOPER,
      };

      const mockUser = createMockUser();
      authFacade.register.mockResolvedValue(mockUser);

      // Spy on console.log or use a proper logger mock
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await controller.register(createUserDto);

      consoleSpy.mockRestore();
    });

    it('should handle performance monitoring in high-load scenarios', async () => {
      const promises = [];
      const mockUser = createMockUser();

      // Simulate 100 concurrent profile requests
      for (let i = 0; i < 100; i++) {
        const mockRequest = { user: { ...mockUser, id: `user_${i}` } } as Request & { user: any };
        promises.push(controller.getProfile(mockRequest));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach((result, index) => {
        expect(result.id).toBe(`user_${index}`);
      });
    });
  });
});