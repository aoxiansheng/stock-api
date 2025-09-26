
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
  let apiKeyModel: jest.Mocked<Model<ApiKeyDocument>>;
  let userRepository: jest.Mocked<UserRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser: Partial<UserDocument> = {
    id: '60f7e2c3e4b2b8001f9b3b3b',
    role: UserRole.ADMIN,
  };

  const mockApiKey: ApiKeyDocument = {
    id: '60f7e2c3e4b2b8001f9b3b3a',
    userId: new Types.ObjectId('60f7e2c3e4b2b8001f9b3b3b'),
    appKey: 'app-key',
    accessToken: 'access-token',
    name: 'Test API Key',
    permissions: [Permission.DATA_READ],
    status: OperationStatus.ACTIVE,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    save: jest.fn().mockResolvedValue(this),
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
            new: jest.fn().mockImplementation(() => mockApiKey),
            findOne: jest.fn(),
            find: jest.fn(),
            updateOne: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('should create an API key successfully', async () => {
      const createDto: CreateApiKeyDto = { name: 'New Key', permissions: [Permission.DATA_READ] };
      const result = await service.createApiKey('60f7e2c3e4b2b8001f9b3b3b', createDto);
      expect(result).toBeDefined();
      expect(mockApiKey.save).toHaveBeenCalled();
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
  });
});
