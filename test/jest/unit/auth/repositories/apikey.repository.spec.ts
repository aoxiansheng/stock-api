
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApiKeyRepository } from '@auth/repositories/apikey.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { ApiKey, ApiKeyDocument } from '@auth/schemas/apikey.schema';
import { Permission } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';

describe('ApiKeyRepository', () => {
  let repository: ApiKeyRepository;
  let apiKeyModel: jest.Mocked<Model<ApiKeyDocument>>;
  let paginationService: jest.Mocked<PaginationService>;

  const mockApiKey: ApiKeyDocument = {
    id: '60f7e2c3e4b2b8001f9b3b3a',
    userId: new Types.ObjectId('60f7e2c3e4b2b8001f9b3b3b'),
    appKey: 'app-key',
    accessToken: 'access-token',
    name: 'Test API Key',
    permissions: [Permission.DATA_READ],
    status: OperationStatus.ACTIVE,
    rateLimit: {
      requestLimit: 1000,
      window: '1h',
    },
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    totalRequestCount: 0,
    lastAccessedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
    toJSON: jest.fn().mockReturnValue({
      id: '60f7e2c3e4b2b8001f9b3b3a',
      userId: '60f7e2c3e4b2b8001f9b3b3b',
      appKey: 'app-key',
      name: 'Test API Key',
      permissions: [Permission.DATA_READ],
      status: OperationStatus.ACTIVE,
    }),
  } as unknown as ApiKeyDocument;

  beforeEach(async () => {
    const mockApiKeyModel = {
      new: jest.fn().mockImplementation(dto => ({ ...dto, save: jest.fn().mockResolvedValue({ ...mockApiKey, ...dto }) })),
      constructor: jest.fn().mockResolvedValue(mockApiKey),
      save: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      updateMany: jest.fn(),
      aggregate: jest.fn(),
    };

    const mockPaginationService = {
      normalizePaginationQuery: jest.fn().mockImplementation((query) => ({ page: query.page || 1, limit: query.limit || 10 })),
      calculateSkip: jest.fn().mockImplementation((page, limit) => (page - 1) * limit),
      createPagination: jest.fn().mockImplementation((page, limit, total) => ({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyRepository,
        {
          provide: getModelToken(ApiKey.name),
          useValue: mockApiKeyModel,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
      ],
    }).compile();

    repository = module.get<ApiKeyRepository>(ApiKeyRepository);
    apiKeyModel = module.get(getModelToken(ApiKey.name));
    paginationService = module.get(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new API Key successfully', async () => {
      const apiKeyData: Partial<ApiKey> = {
        userId: new Types.ObjectId('60f7e2c3e4b2b8001f9b3b3b'),
        appKey: 'app-key',
        accessToken: 'access-token',
        name: 'Test API Key',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
      };

      const result = await repository.create(apiKeyData);

      expect(result).toBeDefined();
      expect(result.appKey).toEqual(apiKeyData.appKey);
    });

    it('should create an API Key without a userId', async () => {
      const apiKeyData: Partial<ApiKey> = {
        appKey: 'app-key-no-user',
        accessToken: 'access-token-no-user',
        name: 'Test API Key No User',
        permissions: [Permission.DATA_READ],
        status: OperationStatus.ACTIVE,
      };

      const result = await repository.create(apiKeyData);
      expect(result).toBeDefined();
      expect(result.userId).toBeUndefined();
    });

    it('should throw an error for an invalid userId format', async () => {
      const apiKeyData = { userId: 'invalid-id' };
      await expect(repository.create(apiKeyData as any)).rejects.toThrow('用户ID格式无效');
    });
  });

  describe('findById', () => {
    it('should find an API Key by ID successfully', async () => {
      const apiKeyId = '60f7e2c3e4b2b8001f9b3b3a';
      (apiKeyModel.findById as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) });
      const result = await repository.findById(apiKeyId);
      expect(result).toEqual(mockApiKey);
      expect(apiKeyModel.findById).toHaveBeenCalledWith(apiKeyId);
    });

    it('should return null if API Key is not found', async () => {
      const apiKeyId = '60f7e2c3e4b2b8001f9b3b3c';
      (apiKeyModel.findById as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const result = await repository.findById(apiKeyId);
      expect(result).toBeNull();
    });

    it('should throw an error for an invalid ID format', async () => {
      await expect(repository.findById('invalid-id')).rejects.toThrow('API Key ID格式无效');
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated API keys for a user', async () => {
      const page = 1, limit = 10, userId = '60f7e2c3e4b2b8001f9b3b3b';
      const apiKeys = [mockApiKey];
      const total = 1;

      (apiKeyModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(apiKeys),
      });
      (apiKeyModel.countDocuments as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(total) });

      const result = await repository.findAllPaginated(page, limit, userId);

      expect(result.apiKeys).toEqual(apiKeys);
      expect(result.total).toBe(total);
      expect(apiKeyModel.find).toHaveBeenCalledWith({ userId, status: OperationStatus.ACTIVE });
    });

    it('should return all paginated API keys when includeInactive is true', async () => {
      const page = 1, limit = 10, userId = '60f7e2c3e4b2b8001f9b3b3b';
      (apiKeyModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockApiKey]),
      });
      (apiKeyModel.countDocuments as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

      await repository.findAllPaginated(page, limit, userId, true);
      expect(apiKeyModel.find).toHaveBeenCalledWith({ userId });
    });

    it('should return paginated API keys without a userId', async () => {
        const page = 1, limit = 10;
        (apiKeyModel.find as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            exec: jest.fn().mockResolvedValue([mockApiKey]),
        });
        (apiKeyModel.countDocuments as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

        await repository.findAllPaginated(page, limit);
        expect(apiKeyModel.find).toHaveBeenCalledWith({ status: OperationStatus.ACTIVE });
    });
  });

  describe('getStats', () => {
    it('should return stats for a specific user', async () => {
      const userId = '60f7e2c3e4b2b8001f9b3b3b';
      (apiKeyModel.countDocuments as jest.Mock)
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(5) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(3) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(1) });
      (apiKeyModel.aggregate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([{ totalRequests: 100, avgRequestsPerKey: 20 }]) });

      const result = await repository.getStats(userId);

      expect(result.totalApiKeys).toBe(5);
      expect(result.activeApiKeys).toBe(3);
      expect(result.expiredApiKeys).toBe(1);
      expect(result.deletedApiKeys).toBe(1);
      expect(result.totalRequests).toBe(100);
    });

    it('should return empty stats when no API keys exist for a user', async () => {
        const userId = '60f7e2c3e4b2b8001f9b3b3c';
        (apiKeyModel.countDocuments as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
        (apiKeyModel.aggregate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
  
        const result = await repository.getStats(userId);
  
        expect(result.totalApiKeys).toBe(0);
        expect(result.activeApiKeys).toBe(0);
        expect(result.expiredApiKeys).toBe(0);
        expect(result.totalRequests).toBe(0);
      });

    it('should return stats for all users if no userId is provided', async () => {
        (apiKeyModel.countDocuments as jest.Mock)
            .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(10) })
            .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(8) })
            .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(2) });
        (apiKeyModel.aggregate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([{ totalRequests: 500, avgRequestsPerKey: 50 }]) });

        const result = await repository.getStats();

        expect(result.totalApiKeys).toBe(10);
        expect(result.activeApiKeys).toBe(8);
        expect(result.expiredApiKeys).toBe(2);
    });
  });

  // Add other simple method tests here to ensure full coverage
  ['findByUserId', 'findActiveByUserId', 'findByAppKey', 'findByAccessToken', 'findByCredentials', 'findAllActive', 'findExpired'].forEach(method => {
    describe(method, () => {
        it(`should call the correct model method`, async () => {
            const modelMock = jest.spyOn(apiKeyModel, method === 'findByCredentials' || method === 'findByAppKey' || method === 'findByAccessToken' ? 'findOne' : 'find');
            (modelMock as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
            await (repository as any)[method]('test');
            expect(modelMock).toHaveBeenCalled();
        });
    });
  });

  ['updateStatus', 'updateUsageStats', 'updateLastAccessTime', 'softDelete'].forEach(method => {
    describe(method, () => {
        it(`should call findByIdAndUpdate`, async () => {
            (apiKeyModel.findByIdAndUpdate as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) });
            await (repository as any)[method]('60f7e2c3e4b2b8001f9b3b3a', {});
            expect(apiKeyModel.findByIdAndUpdate).toHaveBeenCalled();
        });
    });
  });

  describe('hardDelete', () => {
    it('should call findByIdAndDelete', async () => {
        (apiKeyModel.findByIdAndDelete as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue(mockApiKey) });
        await repository.hardDelete('60f7e2c3e4b2b8001f9b3b3a');
        expect(apiKeyModel.findByIdAndDelete).toHaveBeenCalled();
    });
  });

  describe('softDeleteByUserId', () => {
    it('should call updateMany', async () => {
        (apiKeyModel.updateMany as jest.Mock).mockReturnValue({ exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }) });
        await repository.softDeleteByUserId('60f7e2c3e4b2b8001f9b3b3b');
        expect(apiKeyModel.updateMany).toHaveBeenCalled();
    });
  });
});
