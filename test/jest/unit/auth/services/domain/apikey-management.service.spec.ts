
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiKeyManagementService } from '@auth/services/domain/apikey-management.service';
import { UserRepository } from '@auth/repositories/user.repository';
import { CacheService } from '@cache/services/cache.service';
import { ApiKey, ApiKeyDocument } from '@auth/schemas/apikey.schema';
import { User, UserDocument } from '@auth/schemas/user.schema';
import { CreateApiKeyDto } from '@auth/dto/apikey.dto';
import { UserRole, Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';
import { AuthUnifiedConfigInterface } from '@auth/config/auth-unified.config';

describe('ApiKeyManagementService', () => {
  let service: ApiKeyManagementService;
  let apiKeyModel: any; // 修改为any类型以解决TypeScript类型错误
  let userRepository: jest.Mocked<UserRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser: Partial<UserDocument> = {
    id: '60f7e2c3e4b2b8001f9b3b3b',
    role: UserRole.ADMIN,
  };

  // 修改mock对象，确保userId是字符串格式而不是ObjectId，以匹配测试期望
  const mockApiKey: ApiKeyDocument = {
    id: '60f7e2c3e4b2b8001f9b3b3a',
    userId: '60f7e2c3e4b2b8001f9b3b3b', // 改为字符串而不是ObjectId
    appKey: 'app-key',
    accessToken: 'access-token',
    name: 'Test API Key',
    permissions: [Permission.DATA_READ],
    status: OperationStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue({
      id: '60f7e2c3e4b2b8001f9b3b3a',
      userId: '60f7e2c3e4b2b8001f9b3b3b',
      appKey: 'app-key',
      accessToken: 'access-token',
      name: 'Test API Key',
      permissions: [Permission.DATA_READ],
      status: OperationStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      toJSON: jest.fn().mockReturnValue({
        id: '60f7e2c3e4b2b8001f9b3b3a',
        userId: '60f7e2c3e4b2b8001f9b3b3b',
        appKey: 'app-key',
        accessToken: 'access-token',
        name: 'Test API Key',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }),
      _id: {
        toString: () => '60f7e2c3e4b2b8001f9b3b3a'
      }
    }),
    toJSON: jest.fn().mockReturnValue({
      id: '60f7e2c3e4b2b8001f9b3b3a',
      userId: '60f7e2c3e4b2b8001f9b3b3b',
      appKey: 'app-key',
      accessToken: 'access-token',
      name: 'Test API Key',
      permissions: [Permission.DATA_READ],
      status: OperationStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }),
    _id: {
      toString: () => '60f7e2c3e4b2b8001f9b3b3a'
    }
  } as unknown as ApiKeyDocument;

  const mockAuthConfig: AuthUnifiedConfigInterface = {
    cache: { apiKeyCacheTtl: 900 },
    limits: { maxApiKeysPerUser: 10, globalRateLimit: 100, apiKeyValidatePerSecond: 10, maxStringLength: 100, timeoutMs: 5000, apiKeyLength: 32 },
  } as AuthUnifiedConfigInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyManagementService,
        {
          provide: getModelToken(ApiKey.name),
          useValue: {
            // 修改为函数工厂模式，确保每次创建新的mock实例
            mockImplementation: (data) => ({
              ...mockApiKey,
              ...data,
              save: jest.fn().mockResolvedValue({
                ...mockApiKey,
                ...data,
                toJSON: () => ({ ...mockApiKey, ...data })
              })
            }),
            // 添加静态方法，支持链式调用
            findOne: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockApiKey)
            }),
            find: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              sort: jest.fn().mockReturnThis(),
              populate: jest.fn().mockReturnThis(),
              exec: jest.fn().mockResolvedValue([mockApiKey])
            }),
            updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
            findByIdAndUpdate: jest.fn().mockResolvedValue(mockApiKey)
          },
        },
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn().mockResolvedValue(mockUser),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: 'authUnified',
          useValue: mockAuthConfig,
        },
      ],
    }).compile();

    service = module.get<ApiKeyManagementService>(ApiKeyManagementService);
    apiKeyModel = module.get(getModelToken(ApiKey.name));
    userRepository = module.get(UserRepository);
    cacheService = module.get(CacheService);

    // 确保构造函数mock可用于创建新实例
    apiKeyModel.mockImplementation = apiKeyModel.mockImplementation || jest.fn().mockImplementation((data) => ({
      ...mockApiKey,
      ...data,
      save: jest.fn().mockResolvedValue({
        ...mockApiKey,
        ...data,
        toJSON: () => ({ ...mockApiKey, ...data })
      })
    }));

    // 特别处理空数组的情况
    apiKeyModel.find = jest.fn().mockImplementation((criteria) => {
      // 如果是getApiKeysByIds传入空数组，直接返回空数组
      if (criteria && criteria._id && criteria._id.$in && criteria._id.$in.length === 0) {
        return {
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([])
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockApiKey])
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('should create an API key successfully', async () => {
      // 创建一个mockSave函数，并在调用前设置
      const mockSave = jest.fn().mockResolvedValue({
        ...mockApiKey,
        toJSON: () => ({ ...mockApiKey })
      });
      
      // 修改apiKeyModel实现，确保新创建的对象使用我们的mockSave
      apiKeyModel.mockImplementation = jest.fn().mockImplementation(() => ({
        ...mockApiKey,
        save: mockSave
      }));
      
      const createDto: CreateApiKeyDto = { name: 'New Key', permissions: [Permission.DATA_READ] };
      const result = await service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto);
      
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled(); // 测试我们的mock函数是否被调用
    });

    it('should throw an error if user permissions are insufficient', async () => {
        (userRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, role: UserRole.DEVELOPER });
        const createDto: CreateApiKeyDto = { name: 'New Key', permissions: [Permission.SYSTEM_ADMIN] };
        await expect(service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto)).rejects.toThrow();
      });
  });

  describe('validateApiKey', () => {
    it('should return a cached API key if available', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(mockApiKey);
      const result = await service.validateApiKey('app-key', 'access-token');
      expect(result).toEqual(mockApiKey);
      expect(apiKeyModel.findOne).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in cache', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) } as any);
        const result = await service.validateApiKey('app-key', 'access-token');
        expect(result).toEqual(mockApiKey);
        expect(cacheService.set).toHaveBeenCalled();
      });

    it('should throw an error for an expired API key from cache', async () => {
        const expiredKey = { ...mockApiKey, expiresAt: new Date(Date.now() - 1000) };
        (cacheService.get as jest.Mock).mockResolvedValue(expiredKey);
        await expect(service.validateApiKey('app-key', 'access-token')).rejects.toThrow('API key has expired');
    });

    it('should throw an error for an expired API key from DB', async () => {
        const expiredKey = { ...mockApiKey, expiresAt: new Date(Date.now() - 1000) };
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(expiredKey) } as any);
        await expect(service.validateApiKey('app-key', 'access-token')).rejects.toThrow('API key has expired');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key successfully', async () => {
        (apiKeyModel.updateOne as jest.Mock).mockResolvedValue({ matchedCount: 1 } as any);
        await service.revokeApiKey('app-key', '60f7e2c3e4b2b8001f9b3b3b');
        expect(apiKeyModel.updateOne).toHaveBeenCalledWith(
            { appKey: 'app-key', userId: '60f7e2c3e4b2b8001f9b3b3b' },
            expect.any(Object)
        );
    });

    it('should throw an error if API key not found to revoke', async () => {
        (apiKeyModel.updateOne as jest.Mock).mockResolvedValue({ matchedCount: 0 } as any);
        await expect(service.revokeApiKey('app-key', '60f7e2c3e4b2b8001f9b3b3b')).rejects.toThrow();
    });
  });

  // Add more tests for other methods to increase coverage
  describe('getUserApiKeys', () => {
    it('should return a list of API keys for a user', async () => {
        (apiKeyModel.find as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([mockApiKey]) } as any);
        const result = await service.getUserApiKeys('60f7e2c3e4b2b8001f9b3b3b');
        expect(result).toHaveLength(1);
    });
  });

  describe('getApiKeyUsage', () => {
    it('should return usage statistics for an API key', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) } as any);
        const result = await service.getApiKeyUsage('app-key', '60f7e2c3e4b2b8001f9b3b3b');
        expect(result).toBeDefined();
        expect(result.appKey).toBe('app-key');
    });

    it('should throw error if user does not own the key', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue({ ...mockApiKey, userId: new Types.ObjectId() }) } as any);
        await expect(service.getApiKeyUsage('app-key', '60f7e2c3e4b2b8001f9b3b3b')).rejects.toThrow();
    });

    it('should throw error if API key not found', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
        await expect(service.getApiKeyUsage('app-key', '60f7e2c3e4b2b8001f9b3b3b')).rejects.toThrow();
    });
  });

  describe('resetApiKeyRateLimit', () => {
    it('should reset rate limit successfully', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) } as any);
        const result = await service.resetApiKeyRateLimit('app-key', '60f7e2c3e4b2b8001f9b3b3b');
        expect(result).toEqual({ success: true });
    });

    it('should throw error if API key not found', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
        await expect(service.resetApiKeyRateLimit('app-key', '60f7e2c3e4b2b8001f9b3b3b')).rejects.toThrow();
    });

    it('should throw error if user does not own the key', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue({ ...mockApiKey, userId: new Types.ObjectId() }) } as any);
        await expect(service.resetApiKeyRateLimit('app-key', '60f7e2c3e4b2b8001f9b3b3b')).rejects.toThrow();
    });
  });

  describe('findApiKeyByAppKey', () => {
    it('should find API key by appKey', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) } as any);
        const result = await service.findApiKeyByAppKey('app-key');
        expect(result).toEqual(mockApiKey);
    });

    it('should return null if API key not found', async () => {
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);
        const result = await service.findApiKeyByAppKey('app-key');
        expect(result).toBeNull();
    });
  });

  describe('getApiKeysByIds', () => {
    it('should return API keys by IDs', async () => {
        // 创建适当的mock响应，确保userId格式一致
        const mockResponse = [{ 
            ...mockApiKey,
            toJSON: jest.fn().mockReturnValue({
                ...mockApiKey.toJSON(),
                // 确保userId是字符串格式
                userId: '60f7e2c3e4b2b8001f9b3b3b'
            })
        }];

        // 重新设置find方法的mock实现
        apiKeyModel.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue(mockResponse)
        });

        const result = await service.getApiKeysByIds(['60f7e2c3e4b2b8001f9b3b3a']);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockResponse[0].toJSON());
    });

    it('should return empty array for empty IDs', async () => {
        // 特别处理空数组情况
        apiKeyModel.find = jest.fn().mockImplementation((criteria) => {
            if (criteria && criteria._id && criteria._id.$in && criteria._id.$in.length === 0) {
                return {
                    select: jest.fn().mockReturnThis(),
                    exec: jest.fn().mockResolvedValue([])
                };
            }
            return {
                select: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue([mockApiKey])
            };
        });

        const result = await service.getApiKeysByIds([]);
        expect(result).toEqual([]);
    });

    it('should handle invalid ObjectId format', async () => {
        await expect(service.getApiKeysByIds(['invalid-id'])).rejects.toThrow();
    });
  });

  describe('getExpiringApiKeys', () => {
    it('should return expiring API keys', async () => {
        // 正确模拟链式调用，包括populate方法
        apiKeyModel.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([{
                ...mockApiKey,
                toJSON: jest.fn().mockReturnValue({
                    ...mockApiKey.toJSON()
                })
            }])
        });

        const result = await service.getExpiringApiKeys(7);
        expect(result).toHaveLength(1);
    });

    it('should use default 7 days if not specified', async () => {
        // 正确模拟链式调用，包括populate方法
        apiKeyModel.find = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            populate: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([])
        });

        const result = await service.getExpiringApiKeys();
        expect(result).toEqual([]);
        expect(apiKeyModel.find).toHaveBeenCalledWith(expect.objectContaining({
            status: OperationStatus.ACTIVE
        }));
    });
  });

  describe('invalidateApiKeyCache', () => {
    it('should invalidate cache for specific API key', async () => {
        await service.invalidateApiKeyCache('app-key', 'access-token');
        expect(cacheService.del).toHaveBeenCalled();
    });

    it('should handle cache service errors gracefully', async () => {
        (cacheService.del as jest.Mock).mockRejectedValue(new Error('Cache error'));
        await expect(service.invalidateApiKeyCache('app-key', 'access-token')).resolves.not.toThrow();
    });
  });

  describe('cache behavior in validateApiKey', () => {
    it('should handle cache service unavailable gracefully', async () => {
        (cacheService.get as jest.Mock).mockRejectedValue(new Error('Cache unavailable'));
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) } as any);

        const result = await service.validateApiKey('app-key', 'access-token');
        expect(result).toEqual(mockApiKey);
    });

    it('should clear expired key from cache', async () => {
        const expiredKey = { ...mockApiKey, expiresAt: new Date(Date.now() - 1000) };
        (cacheService.get as jest.Mock).mockResolvedValue(expiredKey);

        await expect(service.validateApiKey('app-key', 'access-token')).rejects.toThrow('API key has expired');
        expect(cacheService.del).toHaveBeenCalled();
    });

    it('should cache valid API key after DB lookup', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) } as any);

        const result = await service.validateApiKey('app-key', 'access-token');
        expect(result).toEqual(mockApiKey);
        expect(cacheService.set).toHaveBeenCalled();
    });

    it('should throw error if API key not found in DB', async () => {
        (cacheService.get as jest.Mock).mockResolvedValue(null);
        (apiKeyModel.findOne as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) } as any);

        await expect(service.validateApiKey('app-key', 'access-token')).rejects.toThrow('Invalid API credentials');
    });
  });

  describe('error handling', () => {
    it('should handle database errors in createApiKey', async () => {
        // 为这个测试专门设置保存操作失败的mock
        const saveError = new Error('Database error');
        // 重写apiKeyModel的实现，使其在调用save方法时抛出异常
        apiKeyModel.mockImplementation = jest.fn().mockImplementation(() => ({
            ...mockApiKey,
            save: jest.fn().mockRejectedValue(saveError)
        }));

        const createDto: CreateApiKeyDto = { name: 'New Key', permissions: [Permission.DATA_READ] };
        await expect(service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto)).rejects.toThrow();
        
        // 重置mock以不影响其他测试
        apiKeyModel.mockImplementation = jest.fn().mockImplementation((data) => ({
            ...mockApiKey,
            ...data,
            save: jest.fn().mockResolvedValue({
                ...mockApiKey,
                ...data,
                toJSON: () => ({ ...mockApiKey, ...data })
            })
        }));
    });

    it('should validate ObjectId format in getUserApiKeys', async () => {
        await expect(service.getUserApiKeys('invalid-id')).rejects.toThrow();
    });

    it('should validate ObjectId format in revokeApiKey', async () => {
        await expect(service.revokeApiKey('app-key', 'invalid-id')).rejects.toThrow();
    });

    it('should validate ObjectId format in getApiKeyUsage', async () => {
        await expect(service.getApiKeyUsage('app-key', 'invalid-id')).rejects.toThrow();
    });

    it('should validate ObjectId format in resetApiKeyRateLimit', async () => {
        await expect(service.resetApiKeyRateLimit('app-key', 'invalid-id')).rejects.toThrow();
    });
  });

  describe('permission validation', () => {
    it('should allow admin to create keys with any permissions', async () => {
        (userRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, role: UserRole.ADMIN });
        const createDto: CreateApiKeyDto = { name: 'Admin Key', permissions: [Permission.SYSTEM_ADMIN] };

        const result = await service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto);
        expect(result).toBeDefined();
    });

    it('should throw error for user not found', async () => {
        (userRepository.findById as jest.Mock).mockResolvedValue(null);
        const createDto: CreateApiKeyDto = { name: 'New Key', permissions: [Permission.DATA_READ] };

        await expect(service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto)).rejects.toThrow();
    });

    it('should throw error for developer requesting admin permissions', async () => {
        (userRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, role: UserRole.DEVELOPER });
        const createDto: CreateApiKeyDto = { name: 'Invalid Key', permissions: [Permission.SYSTEM_ADMIN] };

        await expect(service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto)).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle API key creation with custom rate limit', async () => {
        const createDto: CreateApiKeyDto = {
            name: 'Custom Key',
            permissions: [Permission.DATA_READ],
            rateLimit: { requestLimit: 500, window: '5m' }
        };

        const result = await service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto);
        expect(result).toBeDefined();
    });

    it('should handle API key creation with custom expiration', async () => {
        const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        const createDto: CreateApiKeyDto = {
            name: 'Expiring Key',
            permissions: [Permission.DATA_READ],
            expiresAt: futureDate
        };

        const result = await service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto);
        expect(result).toBeDefined();
    });

    it('should handle empty getUserApiKeys result', async () => {
        (apiKeyModel.find as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([])
        } as any);

        const result = await service.getUserApiKeys('60f7e2c3e4b2b8001f9b3b3b');
        expect(result).toEqual([]);
    });
  });
});
